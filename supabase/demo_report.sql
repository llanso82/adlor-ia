-- Read-only. Public keys cannot run this query; use the owner's SQL editor.
-- Replace start/end with the real production activation and reporting cut.
-- Tests are excluded. Sessions and contact intentions are not unique people.
with period as (
  select :'start_utc'::timestamptz as starts, :'end_utc'::timestamptz as ends
), sources(source) as (values ('prospectos'),('usem'),('bni'),('directo')),
events as (
  select source,
    count(*) filter (where kind='visit') as measured_sessions,
    count(*) filter (where kind='contact_click' and channel='email') as email_intentions,
    count(*) filter (where kind='contact_click' and channel='whatsapp') as whatsapp_intentions
  from public.demo_events, period
  where created_at>=starts and created_at<ends and not is_test group by source
), requests as (
  select replace(source,'demo:','') as source, count(*) as registered_requests
  from public.visitors, period
  where created_at>=starts and created_at<ends
    and source in ('demo:prospectos','demo:usem','demo:bni','demo:directo')
  group by source
)
select sources.source,coalesce(measured_sessions,0) as measured_sessions,
  coalesce(email_intentions,0) as email_intentions,
  coalesce(whatsapp_intentions,0) as whatsapp_intentions,
  coalesce(registered_requests,0) as registered_requests
from sources left join events using(source) left join requests using(source)
order by sources.source;
-- External email/WhatsApp replies and agreed meetings are recorded separately
-- from mailbox/manual evidence; never infer them from the click counters above.
