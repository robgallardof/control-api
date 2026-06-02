# Deployment

## 1. Create the Supabase database

Open Supabase SQL Editor and run these files in order:

1. `supabase/schema.sql`
2. `supabase/seed-licenses.sql`

## 2. Configure Vercel environment variables

Open Vercel > Project > Settings > Environment Variables and add the values from `VERCEL_ENV_VALUES.example.txt`.

Use the real Supabase secret key only inside Vercel. Do not commit it to GitHub.

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ifhlsyukotqvuucfxihs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste-your-supabase-secret-key-in-vercel-only>
TOKEN_PEPPER=<generate-a-long-random-token-pepper>
ADMIN_API_KEY=<generate-a-long-random-admin-api-key>
DEFAULT_ENFORCEMENT_MODE=open
```

## 3. Redeploy

After saving the variables, redeploy the Vercel project.

## 4. Test the deployment

```bash
curl https://YOUR_PROJECT.vercel.app/api/health
```

```bash
curl -X POST https://YOUR_PROJECT.vercel.app/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs","deviceId":"test-device-1"}'
```

## 5. Admin dashboard

Open:

```txt
https://YOUR_PROJECT.vercel.app/admin?key=YOUR_ADMIN_API_KEY
```

## Vercel package manager fix

This project uses pnpm. The repository should not contain `package-lock.json`. The included `vercel.json` sets:

```json
{
  "installCommand": "pnpm install --no-frozen-lockfile",
  "buildCommand": "pnpm run build"
}
```

If Vercel reports `Command "npm install" exited with 1`, delete `package-lock.json`, commit the change, and redeploy with the build cache cleared.
