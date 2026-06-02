# Database

Run these files in Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/seed-licenses.sql`

The schema creates:

- `app_settings`
- `licenses`
- `license_devices`
- `account_snapshots`
- `script_events`
- `blocked_rules`
- `license_overview`

The project uses the Supabase secret/service-role key from server-side Vercel Functions.
