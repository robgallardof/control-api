-- Change mode without redeploying.
update app_settings
set value = '"open"'::jsonb, updated_at = now()
where key = 'enforcement_mode';

update app_settings
set value = '"soft"'::jsonb, updated_at = now()
where key = 'enforcement_mode';

update app_settings
set value = '"strict"'::jsonb, updated_at = now()
where key = 'enforcement_mode';

-- Seed the initial test licenses.
-- Run the full file instead when using Supabase SQL Editor:
-- supabase/seed-licenses.sql

-- Block an IP.
insert into blocked_rules (type, value, reason)
values ('ip', '189.123.10.20', 'manual block')
on conflict (type, value) do update set active = true, reason = excluded.reason;

-- Block a device.
insert into blocked_rules (type, value, reason)
values ('device', 'device-uuid-here', 'manual block')
on conflict (type, value) do update set active = true, reason = excluded.reason;

-- Block a raw license token.
insert into blocked_rules (type, value, reason)
values ('token', 'KGM-token-here', 'manual block')
on conflict (type, value) do update set active = true, reason = excluded.reason;

-- Expire one license manually.
update licenses
set expires_at = now(), status = 'expired'
where token_plain = 'KGM-token-here';

-- See licenses and device counts.
select *
from license_overview
order by created_at desc;

-- See latest account activity, including raw account token only when you explicitly need it for test debugging.
select account_name, discord, country, alliance_name, level, pixels_painted, account_token_raw, last_seen_at, last_painted_at, last_url
from account_snapshots
order by updated_at desc;

-- See latest events.
select created_at, event_type, status, account_name, ip_address, country, city, current_url
from script_events
order by created_at desc
limit 100;
