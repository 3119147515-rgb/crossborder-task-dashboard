-- Safe migration for upgrading tasks.role / tasks.owner to the real team structure.
-- Run manually in Supabase SQL Editor.
-- This migration does NOT drop the tasks table and does NOT delete task rows.

begin;

-- 1) Remove old role check constraints on public.tasks.role, regardless of the generated name.
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

-- 2) Map existing seed tasks to the new role / owner structure.
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

-- 3) Add the new role check constraint after old rows have been mapped.
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

-- 4) Optional sanity checks after migration.
select role, count(*) from public.tasks group by role order by role;
select owner, count(*) from public.tasks group by owner order by owner;

commit;
