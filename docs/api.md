# API

Base path: `/api`. JSON only (`Content-Type: application/json`). Auth: `Authorization:
Bearer <token>` header, obtained from register/login.

## Response envelope

- Single resource: `{ "data": { ... } }`
- List: `{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }`
  (pagination arrives with the first list endpoint, on Day 2)
- Delete: `204 No Content`, empty body
- Error: `{ "error": { "code": "...", "message": "...", "details"?: [ { "field": "...", "message": "..." } ] } }`

`details` is present only for `400 VALIDATION_ERROR`. A `field` value is the bare form
field name (e.g. `"password"`, not `"body.password"`) so the client can pass it straight
to `setError(field, ...)` in React Hook Form.

## Standard error codes

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/query/params failed schema validation; see `details` |
| 401 | `UNAUTHENTICATED` | Missing, malformed, expired, or otherwise invalid token |
| 401 | `INVALID_CREDENTIALS` | Login: wrong password, or email not found (same code/message for both, on purpose) |
| 403 | `FORBIDDEN` | Authenticated, but the role doesn't allow this action |
| 403 | `ACCOUNT_DISABLED` | Login (or an authenticated request) for a deactivated account |
| 404 | `NOT_FOUND` | No such route, or a resource that exists but isn't yours |
| 409 | `EMAIL_TAKEN` | Registration with an email already in use |
| 409 | `CONFLICT` | A database constraint was violated (rare - Zod should catch most cases first) |
| 429 | `RATE_LIMITED` | Too many requests in the current window |
| 500 | `INTERNAL` | Unexpected server error - never includes the underlying message |

## Conventions used by every endpoint added from here on

- Money: JSON number, 2 decimal places. Dates: `"YYYY-MM-DD"`. Months: `"YYYY-MM"`.
  Timestamps: ISO 8601 (`TIMESTAMPTZ` as returned by `pg`).
- Wire keys are camelCase; the database is snake_case (converted automatically - see
  `db/pool.js`).
- A route only reads `req.valid.{body,query,params}` (populated by `validate()`), never
  the raw `req.body`/`req.query`/`req.params`.
- New endpoints are grouped under their resource (`/api/auth`, `/api/transactions`,
  `/api/habits`, `/api/goals`, `/api/assets`, `/api/admin`, `/api/feedback`, ...) and
  documented here, in this same shape, in the change that adds them.

## Implemented endpoints (Day 1)

### `GET /api/health` - public

Liveness + database connectivity check, used by Render's health check and for manual
deployment verification. **Not rate-limited** (mounted before the shared `apiLimiter`).

```
200 { "data": { "status": "ok", "database": "up", "uptimeSeconds": 12, "timestamp": "..." } }
503 { "data": { "status": "degraded", "database": "down", "timestamp": "..." } }
```

### `POST /api/auth/register` - public, rate-limited (10 / 15 min / IP)

Body:

| Field | Rule |
|---|---|
| `name` | string, trimmed, 2-80 chars |
| `email` | valid email, ≤254 chars, lowercased |
| `password` | 8-72 bytes, ≥1 letter, ≥1 digit |

Unknown fields (e.g. `role`) are rejected by `.strict()` - this is what stops a client
from self-assigning the admin role.

```
201 { "data": { "token": "<jwt>", "user": { "id", "name", "email", "role": "user", "createdAt" } } }
409 EMAIL_TAKEN
400 VALIDATION_ERROR
```

### `POST /api/auth/login` - public, rate-limited (10 / 15 min / IP)

Body: `{ "email", "password" }` (password: any non-empty string ≤128 chars - strength is
only checked at registration, not login, so an old password never gets locked out by a
later strength-rule change).

```
200 { "data": { "token": "<jwt>", "user": {...} } }
401 INVALID_CREDENTIALS   (wrong password OR unknown email - identical response)
403 ACCOUNT_DISABLED
400 VALIDATION_ERROR
```

### `GET /api/auth/me` - requires authentication

Used by the client on load to validate a stored token and restore the session.

```
200 { "data": { "user": {...} } }
401 UNAUTHENTICATED
```

### `GET /api/admin/ping` - requires authentication + `admin` role

Wiring check for the RBAC foundation - to be replaced by the real admin endpoints
(`/api/admin/analytics`, `/api/admin/users`, `/api/admin/feedback`) on Day 5.

```
200 { "data": { "ok": true, "role": "admin" } }
401 UNAUTHENTICATED   (no/invalid token)
403 FORBIDDEN          (valid token, role != admin)
```

## Planned endpoint groups (not yet implemented)

`/api/users` (Day 2), `/api/transactions` (Day 2), `/api/feedback` (Day 2), `/api/habits`
(Day 3), `/api/goals` (Day 3), `/api/assets` + `/api/liabilities` (Day 4),
`/api/dashboard` (Day 4), the rest of `/api/admin` (Day 5). Each will be documented here,
in this file, in the same change that implements it - this file must never describe an
endpoint that doesn't exist yet as if it were live.
