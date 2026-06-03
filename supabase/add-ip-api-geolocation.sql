-- Store server-side IP geolocation data resolved with ip-api.com.
alter table license_devices add column if not exists country_name text null;
alter table license_devices add column if not exists region_name text null;
alter table license_devices add column if not exists zip text null;
alter table license_devices add column if not exists latitude numeric null;
alter table license_devices add column if not exists longitude numeric null;
alter table license_devices add column if not exists timezone text null;
alter table license_devices add column if not exists isp text null;
alter table license_devices add column if not exists organization text null;
alter table license_devices add column if not exists asn text null;
alter table license_devices add column if not exists geo_source text null;
alter table license_devices add column if not exists ip_geo jsonb null;

alter table script_events add column if not exists country_name text null;
alter table script_events add column if not exists region_name text null;
alter table script_events add column if not exists zip text null;
alter table script_events add column if not exists latitude numeric null;
alter table script_events add column if not exists longitude numeric null;
alter table script_events add column if not exists timezone text null;
alter table script_events add column if not exists isp text null;
alter table script_events add column if not exists organization text null;
alter table script_events add column if not exists asn text null;
alter table script_events add column if not exists geo_source text null;
alter table script_events add column if not exists ip_geo jsonb null;

create index if not exists idx_license_devices_geo_country on license_devices(country, region, city);
create index if not exists idx_script_events_geo_country on script_events(country, region, city);
