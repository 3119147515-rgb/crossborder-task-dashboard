-- BD daily reporting data. Monthly reports are calculated from these daily rows.
-- This migration does not modify or delete tasks or team_members data.

create table if not exists public.bd_daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  member_code text not null references public.team_members(member_code),
  creators_contacted integer not null default 0 check (creators_contacted >= 0),
  valid_replies integer not null default 0 check (valid_replies >= 0),
  connections_created integer not null default 0 check (connections_created >= 0),
  samples_sent integer not null default 0 check (samples_sent >= 0),
  videos_published integer not null default 0 check (videos_published >= 0),
  collaborations_created integer not null default 0 check (collaborations_created >= 0),
  creator_orders integer not null default 0 check (creator_orders >= 0),
  gmv numeric(14, 2) not null default 0 check (gmv >= 0),
  progress_notes text,
  blockers text,
  next_plan text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bd_daily_reports_member_date_key unique (member_code, report_date)
);

create or replace function public.set_bd_daily_reports_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bd_daily_reports_set_updated_at on public.bd_daily_reports;
create trigger bd_daily_reports_set_updated_at
before update on public.bd_daily_reports
for each row execute function public.set_bd_daily_reports_updated_at();

create index if not exists bd_daily_reports_report_date_idx
  on public.bd_daily_reports(report_date desc);

create index if not exists bd_daily_reports_member_code_idx
  on public.bd_daily_reports(member_code, report_date desc);

alter table public.bd_daily_reports enable row level security;

drop policy if exists "bd_daily_reports_select_authenticated" on public.bd_daily_reports;
create policy "bd_daily_reports_select_authenticated"
on public.bd_daily_reports
for select
to authenticated
using (true);

drop policy if exists "bd_daily_reports_insert_authenticated" on public.bd_daily_reports;
create policy "bd_daily_reports_insert_authenticated"
on public.bd_daily_reports
for insert
to authenticated
with check ((select auth.uid()) is not null);

drop policy if exists "bd_daily_reports_update_authenticated" on public.bd_daily_reports;
create policy "bd_daily_reports_update_authenticated"
on public.bd_daily_reports
for update
to authenticated
using (true)
with check ((select auth.uid()) is not null);

grant usage on schema public to authenticated;
grant select, insert, update on public.bd_daily_reports to authenticated;
revoke delete on public.bd_daily_reports from authenticated;

comment on table public.bd_daily_reports is 'BD daily activity reports used to calculate monthly summaries.';
comment on column public.bd_daily_reports.member_code is 'Stable team_members.member_code; display names are resolved in the frontend.';
