create extension if not exists pgcrypto;

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value)
values ('enforcement_mode', '"open"'::jsonb)
on conflict (key) do nothing;

create table if not exists licenses (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  username text null,
  token_plain text null unique,
  token_hash text null unique,
  status text not null default 'active' check (status in ('active', 'blocked', 'expired')),
  max_devices integer not null default 10 check (max_devices > 0),
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz null,
  check (token_plain is not null or token_hash is not null)
);

create table if not exists license_devices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references licenses(id) on delete cascade,
  device_id text not null,
  status text not null default 'active' check (status in ('active', 'blocked')),
  user_agent text null,
  first_ip text null,
  last_ip text null,
  country text null,
  region text null,
  city text null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (license_id, device_id)
);

create table if not exists account_snapshots (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references licenses(id) on delete cascade,
  device_id text not null,
  account_id text not null,
  account_name text null,
  discord text null,
  discord_id text null,
  country text null,
  alliance_id text null,
  alliance_name text null,
  role text null,
  level numeric null,
  pixels_painted numeric null,
  droplets numeric null,
  is_customer boolean null,
  suspension_reason text null,
  timeout_until timestamptz null,
  raw_profile jsonb not null default '{}'::jsonb,
  account_token_hash text null,
  account_token_raw text null,
  picture_hash text null,
  last_seen_at timestamptz not null default now(),
  last_painted_at timestamptz null,
  last_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (license_id, device_id, account_id)
);

create table if not exists script_events (
  id bigint generated always as identity primary key,
  license_id uuid null references licenses(id) on delete set null,
  device_id text not null,
  event_type text not null check (event_type in ('check', 'heartbeat', 'painted', 'denied', 'logout')),
  status text not null,
  ip_address text null,
  country text null,
  region text null,
  city text null,
  user_agent text null,
  script_version text null,
  current_url text null,
  storage_key text null,
  account_id text null,
  account_name text null,
  account_token_hash text null,
  account_token_raw text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists blocked_rules (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('ip', 'token', 'token_hash', 'device', 'country', 'account', 'account_token', 'account_token_hash')),
  value text not null,
  reason text null,
  active boolean not null default true,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (type, value)
);

create index if not exists idx_licenses_token_plain on licenses(token_plain);
create index if not exists idx_licenses_token_hash on licenses(token_hash);
create index if not exists idx_license_devices_license_id on license_devices(license_id);
create index if not exists idx_account_snapshots_license_id on account_snapshots(license_id);
create index if not exists idx_account_snapshots_account_id on account_snapshots(account_id);
create index if not exists idx_script_events_created_at on script_events(created_at desc);
create index if not exists idx_script_events_license_id on script_events(license_id);
create index if not exists idx_script_events_device_id on script_events(device_id);
create index if not exists idx_blocked_rules_lookup on blocked_rules(type, value, active);

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

alter table app_settings enable row level security;
alter table licenses enable row level security;
alter table license_devices enable row level security;
alter table account_snapshots enable row level security;
alter table script_events enable row level security;
alter table blocked_rules enable row level security;

-- The API uses the Supabase service role key from server-side code.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to the browser.
