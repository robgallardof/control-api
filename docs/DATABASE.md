# Database documentation

`control-app` uses Supabase Postgres. The API connects with the Supabase service role key from server-side code only.

## `app_settings`

Stores global JSON settings.

Important key:

```txt
enforcement_mode
```

Allowed values are `open`, `soft`, and `strict`.

## `licenses`

Stores license ownership and access limits.

Important columns:

| Column | Description |
| --- | --- |
| `owner_name` | Friendly owner name. |
| `username` | Optional account username. |
| `token_plain` | Raw license token stored for this test project. |
| `token_hash` | HMAC hash of the license token. |
| `status` | `active`, `blocked`, or `expired`. |
| `max_devices` | Maximum registered browser profiles/devices. |
| `expires_at` | Optional expiration date. |
| `last_seen_at` | Last successful control check. |

## `license_devices`

Stores registered devices per license. A device is the generated `deviceId` stored by Tampermonkey.

A single license cannot register more active devices than `licenses.max_devices`.

## `account_snapshots`

Stores the latest profile state per license, device, and account id.

This table is updated on `/api/script/check` when the payload contains `account.id`.

The raw `picture` base64 field is not stored. The API stores `picture_hash` and keeps the rest of the profile in `raw_profile`.

## `script_events`

Stores the audit trail for checks, heartbeats, painted events, denied events, and logouts.

Use this table to see where the script was used, when it painted, and which account/device/license was involved.

## `blocked_rules`

Stores manual deny rules.

Supported types:

```txt
ip
token
token_hash
device
country
account
```

Rules can expire by setting `expires_at`; otherwise they remain active until disabled.

## `license_overview`

Read-only view used by the dashboard and admin list endpoint. It returns license metadata, token preview, and active device count.
