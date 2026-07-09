# Supabase SQL Maintenance Queries

本文件用于维护跨境电商多平台运营中台的 Supabase 数据库。所有 SQL 请在 Supabase SQL Editor 中按需执行。

## 1. 检查 tasks 表数量

```sql
select count(*) as task_count
from public.tasks;
```

## 2. 检查 platform / role / owner 分布

```sql
select platform, count(*) as task_count
from public.tasks
group by platform
order by platform;

select role, count(*) as task_count
from public.tasks
group by role
order by role;

select owner, count(*) as task_count
from public.tasks
group by owner
order by owner;

select platform, role, owner, count(*) as task_count
from public.tasks
group by platform, role, owner
order by platform, role, owner;
```

## 3. 更新 role check constraint 的迁移 SQL

```sql
begin;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'tasks'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%role%'
  loop
    execute format('alter table public.tasks drop constraint if exists %I', constraint_name);
  end loop;
end $$;

update public.tasks
set role = '产品研发',
    owner = '产品研发进度负责人'
where task_name ~ '(打样|供应链|产品测试|包装|说明书|配件|SKU)'
   or business_module ~ '(打样|供应链|产品测试|包装|说明书|配件|SKU)';

update public.tasks
set role = case
    when platform = 'TikTok' and business_module in ('达人建联') and task_name like '%回收%' then 'BD'
    when platform = 'TikTok' and business_module in ('达人建联') then 'BD'
    when platform = 'TikTok' and business_module = '样品寄送' then 'BD'
    when platform = 'TikTok' and business_module in ('TikTok 广告', '素材测试') then '剪辑'
    when platform = 'TikTok' then 'TikTok运营'
    when platform = 'Amazon' then 'Amazon运营'
    when platform = '独立站' and business_module = '广告落地页' then '剪辑'
    when platform = '独立站' then '项目协同'
    else role
  end,
  owner = case
    when platform = 'TikTok' and business_module = 'TikTok Shop 店铺配置' then 'TikTok运营负责人'
    when platform = 'TikTok' and business_module = '短视频内容' then 'TikTok运营负责人'
    when platform = 'TikTok' and business_module = '达人建联' and task_name like '%回收%' then 'BD02'
    when platform = 'TikTok' and business_module = '达人建联' then 'TikTok运营负责人兼BD负责人'
    when platform = 'TikTok' and business_module = '样品寄送' then 'BD01'
    when platform = 'TikTok' and business_module in ('TikTok 广告', '素材测试') then '剪辑负责人'
    when platform = 'TikTok' and business_module in ('内容复盘') then 'TikTok运营助理'
    when platform = 'TikTok' and business_module = '直播' then 'TikTok运营负责人'
    when platform = 'Amazon' then 'Amazon运营负责人'
    when platform = '独立站' and business_module = 'FAQ 页面' then 'TikTok运营助理'
    when platform = '独立站' and task_name like '%FAQ%' then 'TikTok运营助理'
    when platform = '独立站' and business_module = '广告落地页' then '剪辑负责人'
    when platform = '独立站' then '总项目负责人'
    else owner
  end
where role in ('运营负责人', '项目负责人', 'BD负责人')
   or owner in ('John', 'Lina', 'Mia')
   or platform in ('TikTok', 'Amazon', '独立站');

alter table public.tasks
  add constraint tasks_role_check
  check (role in (
    '总项目负责人',
    'TikTok运营',
    'Amazon运营',
    'BD',
    '产品研发',
    '剪辑',
    '项目协同'
  ));

select role, count(*) from public.tasks group by role order by role;
select owner, count(*) from public.tasks group by owner order by owner;

commit;
```

## 4. 创建 team_members 表的 SQL

```sql
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  member_code text not null unique,
  display_name text,
  role_group text not null check (role_group in (
    '总项目负责人',
    'TikTok运营',
    'Amazon运营',
    'BD',
    '产品研发',
    '剪辑',
    '项目协同'
  )),
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_team_members_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_team_members_updated_at();

insert into public.team_members (member_code, role_group)
values
  ('总项目负责人', '总项目负责人'),
  ('TikTok运营负责人', 'TikTok运营'),
  ('TikTok运营负责人兼BD负责人', 'TikTok运营'),
  ('TikTok运营助理', 'TikTok运营'),
  ('Amazon运营负责人', 'Amazon运营'),
  ('BD01', 'BD'),
  ('BD02', 'BD'),
  ('BD03', 'BD'),
  ('BD04', 'BD'),
  ('BD05', 'BD'),
  ('BD06', 'BD'),
  ('BD07', 'BD'),
  ('BD08', 'BD'),
  ('BD09', 'BD'),
  ('BD10', 'BD'),
  ('产品研发进度负责人', '产品研发'),
  ('剪辑负责人', '剪辑'),
  ('剪辑人员', '剪辑')
on conflict (member_code) do update
set role_group = excluded.role_group;

alter table public.team_members enable row level security;

drop policy if exists "team_members_select_authenticated" on public.team_members;
create policy "team_members_select_authenticated"
on public.team_members
for select
to authenticated
using (true);

drop policy if exists "team_members_update_authenticated" on public.team_members;
create policy "team_members_update_authenticated"
on public.team_members
for update
to authenticated
using (true)
with check (true);

revoke insert, delete on public.team_members from authenticated;
grant select on public.team_members to authenticated;
grant update (display_name, email, is_active) on public.team_members to authenticated;
```

## 5. 验证 team_members 的 SQL

```sql
select count(*) as member_count
from public.team_members;

select role_group, count(*) as member_count
from public.team_members
group by role_group
order by role_group;

select member_code, display_name, role_group, email, is_active, updated_at
from public.team_members
order by role_group, member_code;
```

## 6. 测试修改 BD01 display_name 的 SQL

```sql
update public.team_members
set display_name = '张三',
    email = 'bd01@example.com',
    is_active = true
where member_code = 'BD01';

select member_code, display_name, email, is_active, updated_at
from public.team_members
where member_code = 'BD01';
```

## 7. 检查 tasks.owner 是否能匹配 team_members.member_code

```sql
select
  t.owner,
  tm.member_code,
  tm.display_name,
  count(*) as task_count
from public.tasks t
left join public.team_members tm on tm.member_code = t.owner
group by t.owner, tm.member_code, tm.display_name
order by t.owner;
```

## 8. 查找未匹配 owner 的 SQL

```sql
select distinct t.owner
from public.tasks t
left join public.team_members tm on tm.member_code = t.owner
where tm.member_code is null
order by t.owner;

select t.id, t.platform, t.role, t.owner, t.task_name, t.status, t.due_date
from public.tasks t
left join public.team_members tm on tm.member_code = t.owner
where tm.member_code is null
order by t.platform, t.owner, t.due_date;
```

## 9. 检查 RLS policies 的 SQL

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('tasks', 'team_members')
order by tablename, policyname;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('tasks', 'team_members')
order by c.relname;
```

## 10. 最终健康检查 SQL

```sql
select count(*) as task_count
from public.tasks;

select count(*) as team_member_count
from public.team_members;

select role, count(*) as task_count
from public.tasks
group by role
order by role;

select platform, count(*) as task_count
from public.tasks
group by platform
order by platform;

select owner, count(*) as task_count
from public.tasks
group by owner
order by owner;

select distinct t.owner
from public.tasks t
left join public.team_members tm on tm.member_code = t.owner
where tm.member_code is null
order by t.owner;

select
  t.owner as member_code,
  coalesce(nullif(trim(tm.display_name), ''), t.owner) as display_name,
  count(*) as task_count,
  count(*) filter (where t.status = '进行中') as in_progress_count,
  count(*) filter (where t.status = '已完成') as completed_count,
  count(*) filter (where nullif(trim(coalesce(t.blocker, '')), '') is not null) as blocker_count,
  count(*) filter (where t.due_date < current_date and t.status <> '已完成') as overdue_count
from public.tasks t
left join public.team_members tm on tm.member_code = t.owner
group by t.owner, tm.display_name
order by t.owner;
```
