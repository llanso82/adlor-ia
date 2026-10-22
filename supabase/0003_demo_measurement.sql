-- ADLOR demo: additive migration. No changes to existing customer rows or read permissions.
create table if not exists public.demo_events (
  id uuid primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('prospectos','usem','bni','directo')),
  contact_id text check (contact_id is null or contact_id in ('D-02','B-04','B-05','B-06','D-04','D-05','D-06','B-07','B-08','B-09','D-07','D-08','D-09')),
  kind text not null check (kind in ('visit','contact_click')),
  channel text check (channel is null or channel in ('email','whatsapp')),
  is_test boolean not null default false,
  check ((kind='visit' and channel is null) or (kind='contact_click' and channel is not null)),
  check (contact_id is null or source='prospectos')
);
alter table public.demo_events enable row level security;
revoke all on public.demo_events from anon, authenticated;
grant insert on public.demo_events to anon;
drop policy if exists "insert bounded demo events" on public.demo_events;
create policy "insert bounded demo events" on public.demo_events for insert to anon
  with check (created_at between now()-interval '5 minutes' and now()+interval '1 minute');
create index if not exists demo_events_source_date_idx on public.demo_events(source,created_at);
create index if not exists visitors_source_date_idx on public.visitors(source,created_at);
comment on table public.demo_events is 'Anonymous demo session entries and contact intentions. No IP, email, referrer or raw query. Not unique people or confirmed meetings. Tests explicitly excluded from reporting.';
