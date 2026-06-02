-- Run this only if you already deployed the first version that stored only token_hash.
-- Fresh installs should run supabase/schema.sql instead.

alter table licenses add column if not exists token_plain text null unique;
alter table account_snapshots add column if not exists account_token_raw text null;
alter table script_events add column if not exists account_token_raw text null;

alter table blocked_rules drop constraint if exists blocked_rules_type_check;
alter table blocked_rules add constraint blocked_rules_type_check
  check (type in ('ip', 'token', 'token_hash', 'device', 'country', 'account'));

alter table licenses alter column token_hash drop not null;
alter table licenses drop constraint if exists licenses_token_presence_check;
alter table licenses add constraint licenses_token_presence_check
  check (token_plain is not null or token_hash is not null);

create index if not exists idx_licenses_token_plain on licenses(token_plain);

create or replace view license_overview as
select
  l.id,
  l.owner_name,
  l.username,
  l.status,
  l.max_devices,
  l.expires_at,
  l.created_at,
  l.last_seen_at,
  case
    when l.token_plain is null then null
    when length(l.token_plain) <= 14 then l.token_plain
    else left(l.token_plain, 8) || '...' || right(l.token_plain, 6)
  end as token_preview,
  count(ld.id) filter (where ld.status = 'active') as device_count
from licenses l
left join license_devices ld on ld.license_id = l.id
group by l.id;
