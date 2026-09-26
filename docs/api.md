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

### `POST /api/feedback` - rate-limited (10 / hour / IP)

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

## Implemented endpoints (Day 3)

All Day 3 routes require authentication and are scoped to the authenticated user, with
the same 404-for-not-yours rule as Day 2 - see `AGENTS.md` section 7. `goal_contributions`
additionally carries its own `user_id` column so its queries never rely on a join alone.

### `GET /api/habits?today=YYYY-MM-DD`

`today` is the **client's own local date** (not the server's UTC date) - always send it,
so streaks reflect the user's own calendar day. Defaults to the server's UTC today if
omitted. See `docs/business-rules.md` for the streak definitions.

```
200 { "data": [ { "id", "name", "description", "category", "frequency": "daily",
                   "isActive", "completedToday", "currentStreak", "longestStreak",
                   "createdAt", "updatedAt" }, ... ] }
```

### `POST /api/habits`

Body: `{ "name": string (2-100 chars), "description"?: string (≤255 chars) | null, "category"?: "saving" | "budgeting" | "investing" | "other" }`.
`category` defaults to `"other"` when omitted. Up to 20 habits per user (`409 LIMIT_REACHED`
beyond that).

```
201 { "data": {...} }   // same shape as one item in the list above
400 VALIDATION_ERROR
401 UNAUTHENTICATED
409 LIMIT_REACHED
```

### `GET /api/habits/:id?today=YYYY-MM-DD`

```
200 { "data": {...} }
404 NOT_FOUND
```

### `PUT /api/habits/:id`

Same body as `POST` (full replace) - omitting `category` resets it to `"other"`, exactly
like a fresh create, not "leave unchanged."

```
200 { "data": {...} }
400 VALIDATION_ERROR
404 NOT_FOUND
```

### `DELETE /api/habits/:id`

```
204   // cascades its completions
404 NOT_FOUND
```

### `GET /api/habits/:id/completions`

Full completion history for one habit, as a sorted array of dates.

```
200 { "data": [ "2026-01-05", "2026-01-10", ... ] }
404 NOT_FOUND
```

### `POST /api/habits/:id/completions?today=YYYY-MM-DD`

Body: `{ "date": "YYYY-MM-DD" }` - the date being marked complete, validated with the same
date-range rule as transactions. **Idempotent**: completing an already-completed date is a
`200`, not an error. `today` (query param, separate from `date`) is only used to compute
the returned streak - marking a *backdated* `date` complete never changes what "today"
means for `completedToday`/`currentStreak` in the response.

```
200 { "data": {...} }   // the habit, recomputed
400 VALIDATION_ERROR   (bad/future date)
404 NOT_FOUND
```

### `DELETE /api/habits/:id/completions/:date?today=YYYY-MM-DD`

Removes a completion. Unlike marking complete, this is **not** idempotent - undoing a
date with no completion is a genuine error.

```
200 { "data": {...} }   // the habit, recomputed
404 NOT_FOUND   (habit not found/not yours, OR no completion exists for that date)
```

### `GET /api/goals`

```
200 { "data": [ { "id", "name", "description", "targetAmount", "targetDate",
                   "contributedAmount", "remainingAmount", "progressPercent",
                   "overfundedBy", "status", "createdAt", "updatedAt" }, ... ] }
```

`status` is one of `"in_progress"`, `"completed"`, `"overdue"` - always derived from
contributions, never stored. See `docs/business-rules.md`.

### `POST /api/goals`

Body: `{ "name": string (2-100 chars), "targetAmount": number (>0), "targetDate"?: "YYYY-MM-DD" (must be today or later) | null, "description"?: string (≤255 chars) | null }`.

```
201 { "data": {...} }   // same shape as one item above
400 VALIDATION_ERROR   (non-positive target, a past target date, etc)
401 UNAUTHENTICATED
```

### `GET /api/goals/:id`

```
200 { "data": {...} }
404 NOT_FOUND
```

### `PUT /api/goals/:id`

Same body as `POST`, **except** `targetDate` is not required to be in the future on
update - an existing goal's deadline naturally moves into the past over time, which is
what `"overdue"` status means, not a validation error.

```
200 { "data": {...} }
400 VALIDATION_ERROR
404 NOT_FOUND
```

### `DELETE /api/goals/:id`

```
204   // cascades its contributions
404 NOT_FOUND
```

### `GET /api/goals/:id/contributions`

```
200 { "data": [ { "id", "amount", "contributionDate", "note", "createdAt" }, ... ] }   // newest first
404 NOT_FOUND
```

### `POST /api/goals/:id/contributions`

Body: `{ "amount": number (>0), "contributionDate": "YYYY-MM-DD", "note"?: string (≤200 chars) }`.
Returns both the new contribution and the updated goal so the client can refresh progress
without a second round-trip.

```
201 { "data": { "contribution": {...}, "goal": {...} } }
400 VALIDATION_ERROR
404 NOT_FOUND
```

### `DELETE /api/goals/:id/contributions/:contributionId`

```
200 { "data": { "goal": {...} } }   // recomputed after removal
404 NOT_FOUND
```

## Planned endpoint groups (not yet implemented)

`/api/assets` + `/api/liabilities` (Day 4), `/api/dashboard` (Day 4), the rest of
`/api/admin` - user management, analytics, feedback triage (Day 5). Each will be
documented here, in this file, in the same change that implements it - this file must
never describe an endpoint that doesn't exist yet as if it were live.
