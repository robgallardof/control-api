# control-app

`control-app` is a small **Next.js + Vercel + Supabase Postgres** API for controlling a private Tampermonkey userscript.

It was designed for a simple private rollout:

- Each friend gets one license token.
- Each license can register up to `10` browser profiles/devices by default.
- The API stores license usage, IP metadata, approximate geolocation, account snapshots, current URL, userscript version, event type, and last activity.
- The API can run in `open`, `soft`, or `strict` mode so existing installs do not break before you finish registering licenses.
- There is no Redis, no cache, no queue, and no worker. It is only an API plus a database.

> This test project stores raw license tokens in `licenses.token_plain` and raw account tokens in `account_token_raw` because that was requested for testing. Do not use this storage model for a public production app unless you fully accept the risk.

---

## Included licenses

All included seed licenses are active, allow `10` devices, and expire on `2027-06-01T00:00:00Z`.

Main license:

```txt
KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs
```

Extra generated licenses:

```txt
KGM-ePrSpKrOkH4c7hYthd3Rb7P37JBeQ7QXGZO1
KGM-HZ0gnQbHPMXRyzUpuXLr2wlElIBQbABBABzt
KGM-GjhiC8i4zZJo4HrWyLz4gbYkRzftoSExpaUs
KGM-UnbsxhXRh24m3SdJb38mhhZCVhCRyBim32FD
KGM-tDgXAwfUyry3dLAPnsfsaQuzS5JA887ICDVt
KGM-J4N4JCsg16bQ9RgMpWeWpusfWEytUiJNg1YD
KGM-vps4cI5hFBXaXIFk0WlPL3UqH89dnltg4mbf
KGM-CCNUlUVEAzXjNbwf05XzhxChx6iWhekZleG7
KGM-2WSzAoTxDTvzDhZErTblpMH6oD0bxnGbnkpK
KGM-Y5UNotdGFE4VVtv2eYzFJy6wKDBefz4IKMNL
```

Load them by running `supabase/seed-licenses.sql` after `supabase/schema.sql`.

---

## Project structure

```txt
src/app/api/script/check/route.ts        Main Tampermonkey control endpoint
src/app/api/script/event/route.ts        Alias for the main control endpoint
src/app/api/license/validate/route.ts    Simple license-only validation endpoint
src/app/api/licenses/validate/route.ts   Plural alias for license validation
src/app/api/admin/licenses/route.ts      Admin endpoint to create and list licenses
src/app/api/admin/overview/route.ts      Admin JSON overview endpoint
src/app/admin/page.tsx                   Tiny dashboard page
src/app/page.tsx                         Deployment smoke-check page
src/lib/controlService.ts                License, device, account, and event logic
src/lib/payload.ts                       Zod request schemas and payload types
src/lib/profile.ts                       Account profile normalization
src/lib/http.ts                          IP and Vercel geolocation header helpers
src/lib/hash.ts                          Token generation, HMAC, SHA-256, safe compare
src/lib/env.ts                           Environment variable helpers
src/lib/admin.ts                         Admin authorization helper
supabase/schema.sql                      Fresh database schema
supabase/seed-licenses.sql               Main license + 10 extra licenses
supabase/migration-raw-tokens.sql        Migration from the previous hash-only version
supabase/useful-queries.sql              Manual SQL helpers
scripts/create-license.ts                CLI license generator
scripts/seed-generated-licenses.ts       Prints a SQL seed file with random licenses
tampermonkey/client-example.user.js      Example userscript client
```

---

## Environment variables

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TOKEN_PEPPER=replace-with-a-long-random-secret
ADMIN_API_KEY=replace-with-a-long-admin-key
DEFAULT_ENFORCEMENT_MODE=open
```

Variable notes:

| Name | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. It is public by design. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase service role key. Never expose it in Tampermonkey or client code. |
| `TOKEN_PEPPER` | Yes | Secret used to create HMAC hashes for raw tokens. Raw tokens are also stored in this test build. |
| `ADMIN_API_KEY` | Yes | Key required by admin endpoints and the `/admin` page. |
| `DEFAULT_ENFORCEMENT_MODE` | No | Fallback mode when the database setting is missing. Valid values: `open`, `soft`, `strict`. |

Generate local secrets with:

```bash
openssl rand -hex 32
```

---

## Control modes

The active mode is stored in `app_settings.enforcement_mode`.

| Mode | Missing or invalid token | Valid token |
| --- | --- | --- |
| `open` | Allowed and logged | Allowed, registered, and logged |
| `soft` | Allowed with a warning message | Allowed, registered, and logged |
| `strict` | Blocked | Allowed only if license, expiration, block rules, and device limit pass |

Recommended rollout:

1. Start with `open` so old installs keep working.
2. Move to `soft` when you want to warn users that a license will be required.
3. Move to `strict` when every allowed user already has a token.

Change the mode manually:

```sql
update app_settings
set value = '"strict"'::jsonb,
    updated_at = now()
where key = 'enforcement_mode';
```

---

## Fresh Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run the full contents of `supabase/schema.sql`.
4. Run the full contents of `supabase/seed-licenses.sql`.
5. Copy your project URL and service role key into `.env.local` and Vercel.

If you already ran the previous version of this project, run:

```txt
supabase/migration-raw-tokens.sql
supabase/seed-licenses.sql
```

---

## Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

The home page is only a smoke check. The real endpoints are under `/api/...`.

---

## Deploy to Vercel

1. Push this folder to GitHub.
2. In Vercel, create a new project and import the repository.
3. Add the variables from `.env.example` in **Project Settings > Environment Variables**.
4. Deploy.
5. Copy the final deployment URL, for example:

```txt
https://control-app.vercel.app
```

6. Update `tampermonkey/client-example.user.js`:

```js
const API_BASE_URL = 'https://control-app.vercel.app';
```

7. Update the Tampermonkey metadata header:

```js
// @connect      control-app.vercel.app
```

---

## Main userscript endpoint

```txt
POST /api/script/check
```

Example payload:

```json
{
  "token": "KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs",
  "deviceId": "browser-profile-uuid",
  "eventType": "painted",
  "scriptVersion": "1.0.0",
  "currentUrl": "https://example.com/page",
  "storageKey": "Tampermonkey:licenseToken/deviceId",
  "accountToken": "raw-account-token-from-your-own-flow",
  "account": {
    "allianceId": 624957,
    "allianceName": "TeamGañe",
    "allianceRole": "member",
    "country": "MX",
    "discord": "kinggallardo",
    "discordId": "702289281862991951",
    "droplets": 263,
    "id": 9654968,
    "isCustomer": true,
    "level": 810.5518629554872,
    "name": "Gallardeus",
    "pixelsPainted": 894013,
    "role": "user",
    "rulesRead": true,
    "showDiscord": true,
    "showLastPixel": false,
    "suspensionReason": "griefing",
    "timeoutUntil": "2026-03-13T17:35:08.87031Z"
  },
  "metadata": {
    "paintedAt": "2026-06-01T22:30:00.000Z",
    "paintedPixels": 120
  }
}
```

Allowed response:

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

Blocked response:

```json
{
  "allowed": false,
  "mode": "strict",
  "reason": "Device limit reached.",
  "registeredDevices": 10,
  "maxDevices": 10
}
```

---

## License-only validation endpoint

```txt
POST /api/license/validate
POST /api/licenses/validate
```

Payload:

```json
{
  "token": "KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs"
}
```

Valid response:

```json
{
  "valid": true,
  "licenseId": "uuid",
  "ownerName": "Roberto",
  "username": "Gallardeus",
  "status": "active",
  "maxDevices": 10,
  "expiresAt": "2027-06-01T00:00:00+00:00"
}
```

Invalid response:

```json
{
  "valid": false,
  "reason": "invalid_token"
}
```

This endpoint does not register a device and does not write script events. Use `/api/script/check` for real control.

---

## Admin API

All admin requests require this header:

```txt
x-admin-key: YOUR_ADMIN_API_KEY
```

List licenses:

```bash
curl https://control-app.vercel.app/api/admin/licenses \
  -H "x-admin-key: YOUR_ADMIN_API_KEY"
```

Create a generated license:

```bash
curl -X POST https://control-app.vercel.app/api/admin/licenses \
  -H "content-type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"ownerName":"Friend 11","username":"friend_11","maxDevices":10}'
```

Create a license using your own token:

```bash
curl -X POST https://control-app.vercel.app/api/admin/licenses \
  -H "content-type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{"ownerName":"Roberto","username":"Gallardeus","token":"KGM-custom-token","maxDevices":10,"expiresAt":"2027-06-01T00:00:00Z"}'
```

Overview API:

```bash
curl https://control-app.vercel.app/api/admin/overview \
  -H "x-admin-key: YOUR_ADMIN_API_KEY"
```

Tiny dashboard:

```txt
https://control-app.vercel.app/admin?key=YOUR_ADMIN_API_KEY
```

For a private test project this is fine. For a public app, replace query-string admin access with proper authentication.

---

## CLI license creation

Create a random token:

```bash
npm run create-license -- "Friend 11" "friend_11" 10 "2027-06-01T00:00:00Z"
```

Create a license with a specific token:

```bash
npm run create-license -- "Roberto" "Gallardeus" 10 "2027-06-01T00:00:00Z" "KGM-custom-token"
```

Generate a SQL file with random seed licenses:

```bash
npm run seed-licenses -- 10
```

---

## What gets stored

### `licenses`

Stores the license owner, username, raw token, token hash, status, device limit, expiration, creation date, and last seen date.

### `license_devices`

Stores one row per license and Tampermonkey `deviceId`. A device roughly means one browser profile or Tampermonkey storage context.

### `account_snapshots`

Stores the latest account state per license, device, and account id. It includes account name, Discord data, alliance data, level, pixels painted, droplets, suspension state, last URL, last seen date, and last painted date.

The raw base64 `picture` field is not stored directly. The API stores `picture_hash` to avoid huge database rows.

### `script_events`

Stores each check, heartbeat, painted, denied, or logout event. This table is the audit log.

### `blocked_rules`

Stores manual blocks by IP, raw token, token hash, device id, country, or account id.

---

## Manual blocking examples

Block an IP:

```sql
insert into blocked_rules (type, value, reason)
values ('ip', '189.123.10.20', 'manual block')
on conflict (type, value) do update
set active = true,
    reason = excluded.reason;
```

Block a device:

```sql
insert into blocked_rules (type, value, reason)
values ('device', 'device-uuid-here', 'manual block')
on conflict (type, value) do update
set active = true,
    reason = excluded.reason;
```

Block a raw token:

```sql
insert into blocked_rules (type, value, reason)
values ('token', 'KGM-yYR8S1o5lHUzecKTE0HqEPx9Qdr81hEs', 'manual block')
on conflict (type, value) do update
set active = true,
    reason = excluded.reason;
```

Block a country:

```sql
insert into blocked_rules (type, value, reason)
values ('country', 'RU', 'country blocked')
on conflict (type, value) do update
set active = true,
    reason = excluded.reason;
```

---

## Tampermonkey usage

Use `tampermonkey/client-example.user.js` as the starting point.

Important functions to adapt:

```js
function getAccountProfile() {
  return window.__CURRENT_ACCOUNT_PROFILE__ || null;
}
```

```js
function getOptionalAccountTokenFromYourOwnAppCache() {
  return null;
}
```

The browser cannot expose the real MAC address. The script uses a generated `deviceId` stored with `GM.setValue` instead.

---

## Security notes

- A public userscript can always be edited by a technical user. This API gives you control, auditing, and friction, not perfect DRM.
- MAC address collection is not available from normal browser/Tampermonkey code.
- `SUPABASE_SERVICE_ROLE_KEY`, `TOKEN_PEPPER`, and `ADMIN_API_KEY` must stay server-only.
- Raw token storage is intentionally enabled here for testing. For anything serious, remove raw token storage and rely only on `token_hash`.
- Avoid sending unrelated private data from the userscript. Send only what you need for this control flow.

