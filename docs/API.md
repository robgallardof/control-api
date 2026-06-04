# API

Base URL:

```txt
https://YOUR_APP.vercel.app
```

All responses are JSON and set `Cache-Control: no-store`.

## Health

```txt
GET /api/health
```

Response:

```json
{
  "ok": true,
  "name": "control-app",
  "framework": "nextjs"
}
```

## Validate A Token

```txt
POST /api/license/validate
POST /api/licenses/validate
```

Body:

```json
{
  "token": "KGM-example-token"
}
```

Success:

```json
{
  "valid": true,
  "licenseId": "uuid",
  "ownerName": "Customer Name",
  "username": "customer",
  "status": "active",
  "maxDevices": 10,
  "expiresAt": "2027-06-01T00:00:00Z"
}
```

Failure:

```json
{
  "valid": false,
  "reason": "invalid_token"
}
```

Possible failure reasons:

- `missing_token`
- `invalid_token`
- `blocked_token`
- `expired_license`
- `inactive_license`
- `invalid_request_payload`
- `internal_api_error`

License `status` can be `active`, `inactive`, `blocked`, or `expired`. Only `active` licenses are allowed to use the macro.

## Client Check

```txt
POST /api/script/check
POST /api/script/event
```

Body:

```json
{
  "token": "KGM-example-token",
  "deviceId": "browser-profile-uuid",
  "eventType": "check",
  "scriptVersion": "1.0.0",
  "currentUrl": "https://example.com/page",
  "storageKey": "optional-client-storage-key",
  "accountToken": "optional-wplace-j-cookie-token",
  "account": {
    "id": "user-123",
    "name": "PlayerOne",
    "discord": "playerone",
    "discordId": "123456789",
    "country": "MX",
    "allianceId": "alliance-1",
    "allianceName": "Team",
    "allianceRole": "member",
    "level": 12,
    "pixelsPainted": 2500,
    "droplets": 50,
    "role": "user",
    "isCustomer": true,
    "suspensionReason": null,
    "timeoutUntil": null
  },
  "metadata": {
    "source": "tampermonkey",
    "hasAccountToken": true,
    "accountTokenSource": "gm_cookie"
  }
}
```

Allowed response:

```json
{
  "allowed": true,
  "mode": "strict",
  "ownerName": "Customer Name",
  "username": "customer",
  "expiresAt": "2027-06-01T00:00:00Z",
  "registeredDevices": 1,
  "maxDevices": 10
}
```

Denied response:

```json
{
  "allowed": false,
  "mode": "strict",
  "reason": "Device limit reached.",
  "registeredDevices": 10,
  "maxDevices": 10
}
```

Allowed `eventType` values:

- `check`
- `heartbeat`
- `painted`
- `denied`
- `logout`

`accountToken` is the Wplace `j` cookie value captured by the userscript. The API stores the raw value and hash in server-side audit tables so the manager can block by `account_token` or `account_token_hash`.

The server also resolves request IP geolocation with `ip-api.com` when the client IP is public. The lookup runs in Control API, not in the browser, because the free ip-api endpoint is HTTP-only. The API stores country, region/state, city, ZIP/sector, coordinates, timezone, ISP, organization, ASN, source, and the normalized lookup payload in device and event audit rows. The implementation caches lookups and respects ip-api `X-Rl`/`X-Ttl` rate-limit headers.

## Macro Login

```txt
POST /api/script/login
```

This endpoint is used by KGlacer Macro v5. It validates the serial/license remotely, registers the current device/check, receives WPlace `/me`, and records the available client metadata. It does not use panel users or public registration.

The WPlace `j` cookie/account token is intentionally ignored by this login endpoint, even if an older client sends it. Send that token only through the post-login script check/account sync flow so it is used for account audit and blocking, not for signing in.

Body:

```json
{
  "serialKey": "KGM-example-token",
  "scriptVersion": "5.0.0",
  "currentUrl": "https://wplace.live/",
  "storageKey": "kglacer-macro-settings",
  "client": {
    "userAgent": "navigator.userAgent",
    "platform": "navigator.platform",
    "language": "es-MX",
    "timezone": "America/Mexico_City",
    "screenWidth": 1920,
    "screenHeight": 1080,
    "devicePixelRatio": 1,
    "touchSupport": false,
    "localDeviceId": "persisted-browser-device-id",
    "deviceFingerprintHash": "sha256"
  },
  "wplace": {
    "me": {
      "id": "9654968",
      "name": "Gallardeus"
    }
  }
}
```

Success:

```json
{
  "success": true,
  "accessToken": "signed-license-session",
  "expiresAt": "2026-06-04T00:00:00.000Z",
  "serial": {
    "valid": true,
    "status": "active",
    "licenseId": "uuid",
    "validatedAt": "2026-06-03T00:00:00.000Z"
  },
  "access": {
    "allowed": true,
    "mode": "strict"
  },
  "settings": {
    "autoDraw": {
      "usePixelRange": false,
      "pixel": 60,
      "pixelRange": {
        "min": 1,
        "max": 5
      }
    },
    "farm": {
      "usePixelRange": false,
      "pixel": 60,
      "pixelRange": {
        "min": 1,
        "max": 5
      }
    },
    "imagesCollapsed": false
  }
}
```

Subsequent userscript checks should send `accessToken` to `/api/script/check` instead of re-sending the serial key. The serial remains validated by the API, and the API still re-checks license and device access on each check.

## Admin Events Cleanup

```txt
DELETE /api/admin/events
```

Body examples:

```json
{ "mode": "olderThan", "olderThanDays": 30 }
```

```json
{ "mode": "all" }
```

The endpoint requires an authenticated admin session or `x-admin-key`. It deletes only `script_events`; licenses, users, devices, accounts, and block rules are not removed.

## Admin Authentication

The web admin login page is:

```txt
GET /login
```

Panel users are stored in the `users` table. Create the first admin with `supabase/seed-users.sql`; do not configure panel username/password in environment variables.

Admin routes accept either:

```txt
x-admin-key: YOUR_ADMIN_API_KEY
```

or a valid `/admin` session cookie.

## Admin Overview

```txt
GET /api/admin/overview
```

Returns:

- `metrics`
- `enforcementMode`
- `licenses`
- `accounts`
- `devices`
- `events`
- `blockedRules`

## Create A Token

```txt
POST /api/admin/tokens
POST /api/admin/licenses
```

Body:

```json
{
  "ownerName": "Customer Name",
  "username": "customer",
  "maxDevices": 10,
  "expiresAt": "2027-06-01T00:00:00Z"
}
```

Response:

```json
{
  "license": {
    "id": "uuid",
    "owner_name": "Customer Name",
    "username": "customer",
    "token_plain": "KGM-generated-token",
    "status": "active",
    "max_devices": 10,
    "expires_at": "2027-06-01T00:00:00Z",
    "created_at": "2026-06-02T00:00:00Z"
  },
  "token": "KGM-generated-token",
  "warning": "Store this token now. It is shown only in the creation response and should be shared privately."
}
```

## Update A License

```txt
PATCH /api/admin/licenses
```

Body:

```json
{
  "id": "license-uuid",
  "status": "blocked"
}
```

Allowed `status` values:

- `active`
- `blocked`
- `expired`

## Block Rules

Create or reactivate a block rule:

```txt
POST /api/admin/block-rules
```

Body:

```json
{
  "type": "account",
  "value": "user-123",
  "reason": "manual block",
  "expiresAt": null
}
```

Allowed `type` values:

- `ip`
- `token`
- `token_hash`
- `device`
- `country`
- `account`

Enable or disable a rule:

```txt
PATCH /api/admin/block-rules
```

Body:

```json
{
  "id": "rule-uuid",
  "active": false
}
```

## Devices

Block or reactivate a registered device:

```txt
PATCH /api/admin/devices
```

Body:

```json
{
  "id": "device-uuid",
  "status": "blocked"
}
```

## Settings

Change enforcement mode:

```txt
PATCH /api/admin/settings
```

Body:

```json
{
  "mode": "strict"
}
```
