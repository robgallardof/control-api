# control-app

`control-app` is a Next.js control panel and token-protected API for managing private userscript or client access. It stores license keys, device registrations, account snapshots, block rules, and activity events in Supabase.

The app has two surfaces:

- `/admin`: private manager panel protected by `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- `/api/*`: public and admin API routes used by clients, scripts, and automation.

## Features

- Manager login with username/password from environment variables.
- Analytics for licenses, users, devices, denied requests, and events from the last 24 hours.
- License/key creation from the panel or API.
- Token validation endpoints for external users.
- Userscript check endpoint that registers devices, account snapshots, and Wplace `j` token metadata.
- Blocking by account, device, IP, country, license token, license token hash, Wplace `j` token, or Wplace `j` token hash.
- Enforcement modes: `open`, `soft`, and `strict`.
- Server-only Supabase service-role access. The browser never receives `SUPABASE_SERVICE_ROLE_KEY`.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Zod
- Supabase
- pnpm

## Project Structure

```txt
src/app/
  admin/                  Manager dashboard
  login/                  Manager login
  api/                    Next route handlers
src/components/admin/     Dashboard controls
lib/                      Server services and shared API logic
supabase/                 Database schema and seed SQL
tampermonkey/             Example userscript client
docs/                     API and deployment docs
```

## Environment Variables

Configure these in Vercel and in `.env.local` for local development:

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

`ADMIN_API_KEY` is for admin API automation through the `x-admin-key` header. `ADMIN_USERNAME` and `ADMIN_PASSWORD` are for the web panel.

## Local Development

```bash
pnpm install
pnpm run dev
```

Open:

```txt
http://localhost:3000/admin
```

Checks:

```bash
pnpm run typecheck
pnpm run build
```

## Supabase Setup

Run these files in Supabase SQL Editor:

```txt
supabase/schema.sql
supabase/seed-licenses.sql
supabase/add-account-token-blocking.sql
```

The schema creates:

- `licenses`
- `license_devices`
- `account_snapshots`
- `script_events`
- `blocked_rules`
- `app_settings`
- `license_overview`

## Vercel Deployment

Vercel should detect this project as Next.js. The repository includes:

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm run build"
}
```

Recommended Vercel settings:

- Framework Preset: `Next.js`
- Root Directory: repo root, where `package.json` lives
- Install Command: empty/default
- Build Command: `pnpm run build`
- Node.js Version: `20.x`

If Vercel keeps using an old cache, redeploy with **Clear Build Cache**.

## Public API For Token Users

Give your user a license token such as:

```txt
KGM-example-token
```

They can validate it:

```bash
curl -X POST https://YOUR_APP.vercel.app/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"token":"KGM-example-token"}'
```

They can send script/client checks:

```bash
curl -X POST https://YOUR_APP.vercel.app/api/script/check \
  -H "Content-Type: application/json" \
  -d '{
    "token": "KGM-example-token",
    "deviceId": "browser-profile-uuid",
    "eventType": "check",
    "scriptVersion": "1.0.0",
    "currentUrl": "https://example.com",
    "accountToken": "wplace-j-cookie-value",
    "account": {
      "id": "user-123",
      "name": "PlayerOne",
      "discord": "playerone",
      "country": "MX"
    }
  }'
```

Successful access returns:

```json
{
  "allowed": true,
  "mode": "strict",
  "ownerName": "Customer Name",
  "username": "customer",
  "registeredDevices": 1,
  "maxDevices": 10
}
```

## Admin API

Admin API routes accept either a valid manager session cookie or:

```txt
x-admin-key: YOUR_ADMIN_API_KEY
```

Create a license/key:

```bash
curl -X POST https://YOUR_APP.vercel.app/api/admin/tokens \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{
    "ownerName": "Customer Name",
    "username": "customer",
    "maxDevices": 10
  }'
```

Block an account:

```bash
curl -X POST https://YOUR_APP.vercel.app/api/admin/block-rules \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{
    "type": "account",
    "value": "user-123",
    "reason": "manual block"
  }'
```

Block a Wplace `j` token by hash:

```bash
curl -X POST https://YOUR_APP.vercel.app/api/admin/block-rules \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{
    "type": "account_token_hash",
    "value": "sha256-hash-from-account-snapshot",
    "reason": "manual Wplace token block"
  }'
```

Change enforcement mode:

```bash
curl -X PATCH https://YOUR_APP.vercel.app/api/admin/settings \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"mode":"strict"}'
```

## Enforcement Modes

- `open`: clients can continue even with missing or unknown tokens, while valid tokens are tracked.
- `soft`: clients can continue but invalid/missing tokens receive warning messages.
- `strict`: only active, unexpired, unblocked licenses can continue.

The dashboard can change the mode. The API stores it in `app_settings.enforcement_mode`.

## Security Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_API_KEY`, `ADMIN_SESSION_SECRET`, and `TOKEN_PEPPER` secret.
- Share user license tokens privately.
- Raw license tokens are stored because this project requested visible token management. For production, prefer storing only `token_hash`.
- Rotate the Supabase service-role key if it was ever shared outside Vercel.
