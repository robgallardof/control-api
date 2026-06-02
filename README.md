# control-app

`control-app` is a small Vercel API used to control a Tampermonkey userscript with private license tokens, browser/device limits, expirations, account snapshots, and activity events.

This version does **not** use Next.js. It uses plain **Vercel Serverless Functions** under `/api`, so Vercel does not run `next build`. This avoids the build failure caused by build-time environment validation in the previous package.

## What it stores

The API stores:

- License token in raw form: `licenses.token_plain`
- Optional token hash: `licenses.token_hash`
- License owner and username
- License status and expiration
- Up to 10 browser/device IDs per license by default
- IP, country, region, city, user agent, current URL, script version, event type
- Account snapshot fields such as account id, name, Discord, alliance, level, pixels painted, droplets, suspension info, and last painted time
- Optional raw account token in `account_snapshots.account_token_raw` and `script_events.account_token_raw`

> Raw token storage is only included because this is a test/internal control app. Do not expose this database publicly.

## Project structure

```txt
api/
  health.ts
  license/validate.ts
  licenses/validate.ts
  script/check.ts
  script/event.ts
  admin/overview.ts
  admin/licenses.ts
lib/
  controlService.ts
  supabaseAdmin.ts
  payload.ts
  profile.ts
  hash.ts
  env.ts
  vercelHttp.ts
public/
  index.html
  admin.html
supabase/
  schema.sql
  seed-licenses.sql
  migration-raw-tokens.sql
  useful-queries.sql
tampermonkey/
  client-example.user.js
```


## Package manager

This package is configured for **pnpm** on Vercel. It intentionally does not include `package-lock.json`, `next.config.ts`, or `next-env.d.ts`, because those can make Vercel choose the wrong installer or framework behavior.

Vercel is forced to run:

```txt
pnpm install --no-frozen-lockfile
pnpm run build
```

If Vercel still runs `npm install`, remove any committed `package-lock.json`, push again, and redeploy with cleared build cache.

## Environment variables

Add these variables in Vercel under **Project > Settings > Environment Variables**.

```env
NEXT_PUBLIC_SUPABASE_URL=https://ifhlsyukotqvuucfxihs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste-your-supabase-secret-key-in-vercel-only>
TOKEN_PEPPER=control_app_pepper_yFXVrX6kB1kXFLoEmHvHt9yVpyYjRl9WnnSOYHFTJTpxtyV5
ADMIN_API_KEY=control_app_admin_zkuvhA2kiV6N1DVZEZf2Atdg-XEj4ofQnessQx-VYEEJ_wmI
DEFAULT_ENFORCEMENT_MODE=open
```

The generated values requested for this test project are also included in `VERCEL_ENV_VALUES.example.txt`.

Important: rotate/regenerate the Supabase secret key after the test deployment works, because it was shared outside Supabase.

## Supabase setup

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed-licenses.sql`.

The seed file creates your license plus 10 extra test licenses. All seed licenses allow 10 devices and expire on `2027-06-01T00:00:00Z`.

Main license:

```txt
KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs
```

## Vercel deployment

1. Upload/import this project to GitHub.
2. Import the repository in Vercel.
3. Select **Other** or let Vercel auto-detect it as a Vercel Functions project.
4. Keep the build command as `npm run build`.
5. Add the environment variables listed above.
6. Deploy.

The build script intentionally only prints a message:

```bash
npm run build
```

Vercel will still build the files inside `/api` as serverless functions.

## Endpoints

### Health check

```txt
GET /api/health
```

Response:

```json
{
  "ok": true,
  "name": "control-app"
}
```

### Validate license only

```txt
POST /api/license/validate
POST /api/licenses/validate
```

Body:

```json
{
  "token": "KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs"
}
```

Possible success response:

```json
{
  "valid": true,
  "licenseId": "...",
  "ownerName": "Roberto",
  "username": "Gallardeus",
  "status": "active",
  "maxDevices": 10,
  "expiresAt": "2027-06-01T00:00:00+00:00"
}
```

### Userscript check/event

```txt
POST /api/script/check
POST /api/script/event
```

Body:

```json
{
  "token": "KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs",
  "deviceId": "browser-profile-uuid",
  "eventType": "check",
  "scriptVersion": "1.0.0",
  "currentUrl": "https://example.com/page",
  "accountToken": "optional-raw-account-token",
  "account": {
    "id": 9654968,
    "name": "Gallardeus",
    "discord": "kinggallardo",
    "discordId": "702289281862991951",
    "country": "MX",
    "allianceId": 624957,
    "allianceName": "TeamGañe",
    "allianceRole": "member",
    "level": 810.5518629554872,
    "pixelsPainted": 894013,
    "droplets": 263,
    "role": "user",
    "isCustomer": true,
    "suspensionReason": "griefing",
    "timeoutUntil": "2026-03-13T17:35:08.87031Z"
  },
  "metadata": {
    "source": "tampermonkey"
  }
}
```

Possible response:

```json
{
  "allowed": true,
  "mode": "open",
  "ownerName": "Roberto",
  "username": "Gallardeus",
  "expiresAt": "2027-06-01T00:00:00+00:00",
  "registeredDevices": 1,
  "maxDevices": 10
}
```

## Enforcement modes

The API reads `app_settings.enforcement_mode` first. If it does not exist, it falls back to `DEFAULT_ENFORCEMENT_MODE`.

Supported values:

```txt
open
soft
strict
```

Recommended migration:

1. `open`: everyone continues working; registered licenses get tracked.
2. `soft`: everyone continues working, but unregistered/invalid tokens get warning messages.
3. `strict`: only valid active licenses can continue.

To change the mode in Supabase:

```sql
update app_settings
set value = '"strict"'::jsonb,
    updated_at = now()
where key = 'enforcement_mode';
```

## Admin dashboard

Open:

```txt
https://YOUR-VERCEL-APP.vercel.app/admin?key=YOUR_ADMIN_API_KEY
```

With the generated key from this project:

```txt
https://YOUR-VERCEL-APP.vercel.app/admin?key=control_app_admin_zkuvhA2kiV6N1DVZEZf2Atdg-XEj4ofQnessQx-VYEEJ_wmI
```

The dashboard is a static HTML page that calls:

```txt
GET /api/admin/overview
```

with this header:

```txt
x-admin-key: YOUR_ADMIN_API_KEY
```

## Tampermonkey setup

Open `tampermonkey/client-example.user.js` and update:

```js
const API_BASE_URL = 'https://YOUR-VERCEL-APP.vercel.app';
```

Also update the `@connect` header:

```js
// @connect      YOUR-VERCEL-APP.vercel.app
```

Then use the userscript menu command to save a token.

## Local checks

Install dependencies:

```bash
npm install
```

Typecheck:

```bash
npm run typecheck
```

Build command:

```bash
npm run build
```

The build command should not run Next.js. It only prints a message because this project is deployed as Vercel Functions.
