# Database

Run these files in Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/seed-licenses.sql`

For existing databases created before `account_token` blocking, also run:

3. `supabase/add-account-token-blocking.sql`

The schema creates:

- `app_settings`
- `licenses`
- `license_devices`
- `account_snapshots`
- `script_events`
- `blocked_rules`
- `license_overview`

`account_snapshots` and `script_events` store the Wplace `j` cookie hash/raw token when the userscript can read it, and `blocked_rules.type` supports `account_token` and `account_token_hash`.

The project uses the Supabase secret/service-role key from server-side Vercel Functions.
