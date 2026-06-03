-- Allow admins to pause a license without treating it as a blocked/banned key.
alter table licenses drop constraint if exists licenses_status_check;

alter table licenses
  add constraint licenses_status_check
  check (status in ('active', 'inactive', 'blocked', 'expired'));
