-- ONLY a fresh disposable local database. Role creation intentionally fails on an existing Supabase project.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
\ir ../supabase/0001_visitors.sql
grant usage on schema public to anon;
grant insert on public.visitors to anon;
\ir ../supabase/0003_demo_measurement.sql
set role anon;
insert into public.demo_events(id,source,kind,is_test) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','usem','visit',true);
do $$begin
  begin insert into public.demo_events(id,source,kind,is_test) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','usem','visit',true); raise exception 'Duplicate event accepted'; exception when unique_violation then null; end;
end$$;
do $$begin
  begin perform * from public.demo_events; raise exception 'Public SELECT unexpectedly allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.demo_events(id,source,kind) values(gen_random_uuid(),'unknown','visit'); raise exception 'Unknown source accepted'; exception when check_violation then null; end;
  begin insert into public.demo_events(id,source,kind) values(gen_random_uuid(),'bni','meeting'); raise exception 'False meeting event accepted'; exception when check_violation then null; end;
end$$;
insert into public.visitors(id,name,email,source) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','QA ficticio','qa@example.invalid','demo-qa:usem');
do $$begin
  begin insert into public.visitors(id,name,email,source) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','QA ficticio','qa@example.invalid','demo-qa:usem'); raise exception 'Duplicate request accepted'; exception when unique_violation then null; end;
end$$;
reset role;
do $$begin
  if (select count(*) from public.demo_events)<>1 then raise exception 'Event duplicate'; end if;
  if (select count(*) from public.visitors)<>1 then raise exception 'Request duplicate'; end if;
end$$;
select 'PASS: insert-only, bounded sources/types, event and request idempotency' as result;

