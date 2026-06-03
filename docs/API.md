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

## Admin Authentication

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
