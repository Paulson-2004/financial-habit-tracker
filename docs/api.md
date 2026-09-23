# API

Base path: `/api`. JSON only (`Content-Type: application/json`). Auth: `Authorization:
Bearer <token>` header, obtained from register/login.

## Response envelope

- Single resource: `{ "data": { ... } }`
- List: `{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }`
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

## Implemented endpoints (Day 2)

All Day 2 routes require authentication (`Authorization: Bearer <token>`) and are scoped
to the authenticated user - see `AGENTS.md` section 7. A transaction or feedback item
that exists but belongs to someone else responds `404 NOT_FOUND`, identically to one that
doesn't exist at all, so an id in a URL can never be used to probe another account's data.

### `GET /api/users/me`

The financial profile only - identity fields (name/email/role) still come from
`GET /api/auth/me`, unchanged from Day 1.

```
200 { "data": { "profile": { "currency": "INR", "occupation": null,
                              "monthlyBudget": null, "monthlySavingsTarget": null,
                              "updatedAt": "..." } } }
```

### `PATCH /api/users/me`

Body (all optional, but at least one key required; `null` explicitly clears a field,
omitting a key leaves it unchanged):

| Field | Rule |
|---|---|
| `currency` | 3-letter code, uppercased (e.g. `"usd"` -> `"USD"`) |
| `occupation` | ≤80 chars, or `null` |
| `monthlyBudget` | ≥0, ≤1,000,000,000, or `null` |
| `monthlySavingsTarget` | ≥0, ≤1,000,000,000, or `null` |

```
200 { "data": { "profile": {...} } }
400 VALIDATION_ERROR   (negative amount, bad currency code, empty body, unknown field)
401 UNAUTHENTICATED
```

### `GET /api/transactions/categories?type=income|expense`

Lists system categories (`type` filter optional). Requires authentication only because
every page of the app does - the categories themselves aren't per-user data yet.

```
200 { "data": [ { "id", "name", "type", "color" }, ... ] }
```

### `GET /api/transactions/summary?month=YYYY-MM`

`month` defaults to the server's current UTC month. See `docs/business-rules.md` for the
exact formulas and edge cases (zero income, an empty month, etc).

```
200 { "data": { "month": "2026-01", "income": 50000, "expenses": 12000,
                 "netSavings": 38000, "savingsRate": 76, "transactionCount": 2,
                 "incomeByCategory": [ { "categoryId", "name", "color", "amount", "percent" } ],
                 "expensesByCategory": [ {...} ] } }
```

### `GET /api/transactions`

Query params (all optional except pagination defaults):

| Param | Rule |
|---|---|
| `type` | `income` \| `expense` |
| `categoryId` | UUID |
| `month` | `YYYY-MM` - if present, overrides `startDate`/`endDate` |
| `startDate`, `endDate` | `YYYY-MM-DD`, inclusive on both ends |
| `search` | ≤100 chars, matched against `description` (case-insensitive, `%`/`_` escaped) |
| `page` | integer ≥1, default 1 |
| `pageSize` | integer 1-100, default 20 |

```
200 { "data": [ { "id", "type", "amount", "description", "date",
                   "category": { "id", "name", "color" }, "createdAt", "updatedAt" } ],
      "meta": { "page", "pageSize", "total", "totalPages" },
      "totals": { "income", "expenses", "netSavings" } }   // totals cover the whole filtered set, not just the page
```

### `GET /api/transactions/:id`

```
200 { "data": {...} }   // same shape as one item above
404 NOT_FOUND
```

### `POST /api/transactions`

Body:

| Field | Rule |
|---|---|
| `type` | `income` \| `expense` |
| `categoryId` | UUID of a category whose own `type` matches this field |
| `amount` | > 0, ≤1,000,000,000, at most 2 decimal places |
| `transactionDate` | `YYYY-MM-DD`, a real calendar date, on/after 2000-01-01, at most 1 day ahead of the server's UTC date - see `docs/business-rules.md` |
| `description` | ≤200 chars, optional |

```
201 { "data": {...} }
400 VALIDATION_ERROR   (including categoryId/type mismatch - field "categoryId")
401 UNAUTHENTICATED
```

### `PUT /api/transactions/:id`

Same body as `POST` (full replace, not a partial patch).

```
200 { "data": {...} }
400 VALIDATION_ERROR
404 NOT_FOUND
```

### `DELETE /api/transactions/:id`

```
204
404 NOT_FOUND
```

### `POST /api/feedback`

Body: `{ "type": "feedback" | "complaint", "subject": string (3-150 chars), "message": string (10-2000 chars) }`.

```
201 { "data": { "id", "type", "subject", "message", "status": "open", "createdAt", "updatedAt" } }
400 VALIDATION_ERROR
401 UNAUTHENTICATED
```

### `GET /api/feedback/mine?page=&pageSize=`

```
200 { "data": [ {...} ], "meta": { "page", "pageSize", "total", "totalPages" } }
```

### `GET /api/feedback/:id`

```
200 { "data": {...} }
404 NOT_FOUND   (including another user's feedback)
```

## Planned endpoint groups (not yet implemented)

`/api/habits` (Day 3), `/api/goals` (Day 3), `/api/assets` + `/api/liabilities` (Day 4),
`/api/dashboard` (Day 4), the rest of `/api/admin` - user management, analytics, feedback
triage (Day 5). Each will be documented here, in this file, in the same change that
implements it - this file must never describe an endpoint that doesn't exist yet as if it
were live.
