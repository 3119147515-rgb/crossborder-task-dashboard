-- Team member display-name configuration.
-- This migration does NOT modify or delete existing tasks data.

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
