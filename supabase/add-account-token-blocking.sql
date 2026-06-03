alter table blocked_rules
  drop constraint if exists blocked_rules_type_check;

alter table blocked_rules
  add constraint blocked_rules_type_check
  check (type in ('ip', 'token', 'token_hash', 'device', 'country', 'account', 'account_token', 'account_token_hash'));

create index if not exists idx_account_snapshots_account_token_hash
  on account_snapshots(account_token_hash);

create index if not exists idx_script_events_account_token_hash
  on script_events(account_token_hash);
