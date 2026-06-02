# API

## `GET /api/health`

Returns a basic health response.

## `POST /api/license/validate`

Validates a raw license token without registering a device.

## `POST /api/licenses/validate`

Alias for `/api/license/validate`.

## `POST /api/script/check`

Validates a userscript request, registers the device, stores account snapshots, and logs an event.

## `POST /api/script/event`

Alias for `/api/script/check`.

## `GET /api/admin/overview`

Returns dashboard data. Requires header:

```txt
x-admin-key: YOUR_ADMIN_API_KEY
```

## `GET /api/admin/licenses`

Lists licenses. Requires admin key header.

## `POST /api/admin/licenses`

Creates a license. Requires admin key header.
