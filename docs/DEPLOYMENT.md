# Deployment guide

This guide explains how to run `control-app` locally and deploy it to Vercel.

## 1. Create Supabase project

Create a new Supabase project and open the SQL Editor.

For a fresh install, run these files in order:

```txt
supabase/schema.sql
supabase/seed-licenses.sql
```

If you already used the previous version of the project, run:

```txt
supabase/migration-raw-tokens.sql
supabase/seed-licenses.sql
```

## 2. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TOKEN_PEPPER=replace-with-a-long-random-secret
ADMIN_API_KEY=replace-with-a-long-admin-key
DEFAULT_ENFORCEMENT_MODE=open
```

Generate secrets with:

```bash
openssl rand -hex 32
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## 4. Deploy to Vercel

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Add every variable from `.env.example` in Vercel project settings.
4. Deploy.
5. Copy the deployed URL.

## 5. Update Tampermonkey

Change the API URL:

```js
const API_BASE_URL = 'https://control-app.vercel.app';
```

Change the metadata connect rule:

```js
// @connect      control-app.vercel.app
```

## 6. Recommended rollout

Keep the database mode as `open` at first:

```sql
update app_settings
set value = '"open"'::jsonb,
    updated_at = now()
where key = 'enforcement_mode';
```

After users receive tokens, move to `soft`:

```sql
update app_settings
set value = '"soft"'::jsonb,
    updated_at = now()
where key = 'enforcement_mode';
```

When you are ready to enforce licenses, move to `strict`:

```sql
update app_settings
set value = '"strict"'::jsonb,
    updated_at = now()
where key = 'enforcement_mode';
```
