# Deployment

## 1. Supabase

Open Supabase SQL Editor and run:

```txt
supabase/schema.sql
supabase/seed-licenses.sql
```

Use the Supabase service-role key only in server-side environment variables.

## 2. Vercel Environment Variables

Add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
TOKEN_PEPPER=<long-random-token-pepper>
ADMIN_API_KEY=<long-random-admin-api-key>
ADMIN_USERNAME=<manager-username>
ADMIN_PASSWORD=<manager-password>
ADMIN_SESSION_SECRET=<long-random-cookie-signing-secret>
DEFAULT_ENFORCEMENT_MODE=open
```

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are used by `/admin`.

`ADMIN_API_KEY` is used by automation and admin API callers through:

```txt
x-admin-key: YOUR_ADMIN_API_KEY
```

## 3. Vercel Build Settings

Use:

- Framework Preset: `Next.js`
- Root Directory: repository root
- Install Command: empty/default
- Build Command: `pnpm run build`
- Node.js Version: `20.x`

The repository includes:

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm run build"
}
```

## 4. Redeploy

After saving environment variables, redeploy.

If Vercel used old settings, select **Clear Build Cache**.

## 5. Smoke Tests

Health:

```bash
curl https://YOUR_PROJECT.vercel.app/api/health
```

Validate a token:

```bash
curl -X POST https://YOUR_PROJECT.vercel.app/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"KGM-example-token"}'
```

Create a token by admin API:

```bash
curl -X POST https://YOUR_PROJECT.vercel.app/api/admin/tokens \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"ownerName":"Customer Name","username":"customer","maxDevices":10}'
```

Manager panel:

```txt
https://YOUR_PROJECT.vercel.app/admin
```

## Troubleshooting

If Vercel runs `npm install`, remove `package-lock.json`, commit `pnpm-lock.yaml`, and clear build cache.

If Vercel says `No Next.js version detected`, confirm:

- `next` exists in `dependencies`.
- Framework Preset is `Next.js`.
- Root Directory points to the folder containing `package.json`.

If the panel redirects to `/login` forever, verify `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `ADMIN_API_KEY`.
