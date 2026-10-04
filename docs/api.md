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

RBAC wiring check from Day 1, kept as a lightweight health probe for admin access.

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
200 { "data": [ { "id", "name", "description", "category", "frequency": "daily" | "weekly" | "monthly",
                   "reminderEnabled": boolean, "reminderTime": "HH:MM" | null,
                   "isActive", "completedToday", "isCompletedThisPeriod", "currentStreak", "longestStreak",
                   "createdAt", "updatedAt" }, ... ] }
```

### `POST /api/habits`

Body: `{ "name": string (2-100 chars), "description"?: string (≤255 chars) | null, "category"?: "saving" | "budgeting" | "investing" | "other", "frequency"?: "daily" | "weekly" | "monthly", "reminderEnabled"?: boolean, "reminderTime"?: string (HH:MM) | null }`.
`category` defaults to `"other"`, `frequency` defaults to `"daily"`, and `reminderEnabled` defaults to `false` when omitted. Up to 20 habits per user (`409 LIMIT_REACHED`
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

## Implemented endpoints (Day 4)

All Day 4 routes require authentication and are scoped to the authenticated user, with
the same 404-for-not-yours rule as Days 2-3. Net worth is derived only from
`assets`/`liabilities` - never from transactions or goal contributions (see
`docs/business-rules.md` section 1).

### `GET /api/assets`

```
200 { "data": [ { "id", "name", "category", "value", "description", "createdAt", "updatedAt" }, ... ] }
```

### `POST /api/assets`

Body: `{ "name": string (2-100 chars), "category"?: "cash" | "bank_account" | "fixed_deposit" | "stocks" | "mutual_funds" | "gold" | "property" | "vehicle" | "other", "value": number (>0), "description"?: string (≤255 chars) | null }`.
`category` defaults to `"other"` when omitted.

```
201 { "data": {...} }
400 VALIDATION_ERROR
401 UNAUTHENTICATED
```

### `GET /api/assets/:id`

```
200 { "data": {...} }
404 NOT_FOUND
```

### `PATCH /api/assets/:id`

**Partial update** (unlike transactions/habits/goals' `PUT` full-replace) - every field
optional, at least one required. This mirrors `PATCH /api/users/me`'s pattern, not
`PUT /api/transactions/:id`'s - matches the method the Day 4 spec asked for.

```
200 { "data": {...} }
400 VALIDATION_ERROR   (including an empty body)
404 NOT_FOUND
```

### `DELETE /api/assets/:id`

```
204
404 NOT_FOUND
```

### `GET /api/liabilities`, `POST /api/liabilities`, `GET /api/liabilities/:id`, `PATCH /api/liabilities/:id`, `DELETE /api/liabilities/:id`

Identical shape to the `/api/assets` group above, with `amount` (the current outstanding
balance) in place of `value`, and `category` one of `"credit_card"`, `"personal_loan"`,
`"education_loan"`, `"vehicle_loan"`, `"home_loan"`, `"other"`.

### `GET /api/wealth/summary`

Consolidated read for the Dashboard and Wealth page. `totalAssets`/`totalLiabilities` are
summed from the user's current rows; `netWorth = totalAssets - totalLiabilities`, never
clamped (can be negative). `netWorthChange` compares the current net worth against the
most recent snapshot, if any.

```
200 { "data": { "totalAssets", "totalLiabilities", "netWorth",
                 "assetAllocation": [ { "category", "amount", "percent" } ],
                 "liabilityBreakdown": [ {...} ],
                 "netWorthHistory": [ { "id", "date", "totalAssets", "totalLiabilities", "netWorth" } ],
                 "netWorthChange": { "amount", "percent" } } }   // both null if there is no prior snapshot
401 UNAUTHENTICATED
```

There is no separate `GET /api/wealth/snapshots` - `netWorthHistory` above already is
that list (up to the 90 most recent, oldest first), so a second endpoint would be
redundant.

### `POST /api/wealth/snapshots`

Takes **no body** - always records the server's UTC "today" with totals computed
server-side from the user's *current* `assets`/`liabilities` at the moment of the call
(any body the client sends, e.g. a spoofed `totalAssets` or `date`, is ignored - there is
nothing to validate because there is nothing to accept). User-triggered only; there is no
scheduler. A second call on the same day **upserts** the existing snapshot with fresh
totals rather than erroring or duplicating - see `docs/database.md`.

```
201 { "data": { "id", "date", "totalAssets", "totalLiabilities", "netWorth" } }
401 UNAUTHENTICATED
```

## Implemented endpoints (Day 5)

All Day 5 routes require authentication **and** the `admin` role
(`authenticate` + `requireRole('admin')`). Unauthenticated requests get `401
UNAUTHENTICATED`; authenticated non-admins get `403 FORBIDDEN`. Responses carry
safe account metadata and platform-level aggregates only - never password hashes,
tokens, or individual users' financial records (amounts, descriptions, habit names,
goal targets).

### `GET /api/admin/overview`

Platform-level aggregates for the Admin Panel overview tab: user totals
(`total`, `active`, `activeAdmins`, `newLast7Days`, `newLast30Days`), content
counts (`transactions`, `habits`, `habitCompletions`, `savingsGoals`,
`goalContributions`, `assets`, `liabilities`), feedback counts (`total`, `open`,
`inReview`, `resolved`, `complaints`), per-month activity for the last 6 months
(`monthlyTrends: [{ month: "YYYY-MM", newUsers, transactions, feedback }]`,
months with zero activity included), and the 5 newest users / newest feedback
submissions (safe fields only).

```
200 { "data": { "users": {...}, "content": {...}, "feedback": {...},
                "monthlyTrends": [...], "recentUsers": [...], "recentFeedback": [...] } }
401 UNAUTHENTICATED
403 FORBIDDEN
```

### `GET /api/admin/users?search=&role=user|admin&isActive=true|false&page=&pageSize=`

Paginated user list, newest first. `search` matches name or email
(case-insensitive, `%`/`_` escaped). Every row is safe metadata only:
`{ id, name, email, role, isActive, lastLoginAt, createdAt }`.

```
200 { "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }
400 VALIDATION_ERROR   (bad role/isActive value, unknown query key)
```

### `GET /api/admin/users/:id`

```
200 { "data": {...} }   // same safe shape as one list item
404 NOT_FOUND
```

### `PATCH /api/admin/users/:id`

Activation toggle only - body `{ "isActive": boolean }`. There is deliberately **no**
endpoint that changes anyone's role, so privilege changes stay a database-owner
operation and can never come from a request. Guards: deactivating your own account
is `403 FORBIDDEN`; deactivating the last active admin is `409 CONFLICT`.

```
200 { "data": {...} }
400 VALIDATION_ERROR   (non-boolean, empty body, unknown field such as "role")
403 FORBIDDEN          (non-admin, or self-deactivation)
404 NOT_FOUND
409 CONFLICT           (last active admin)
```

### `GET /api/admin/feedback?status=&type=&search=&page=&pageSize=`

All users' submissions, newest first, with `status` (`open` | `in_review` |
`resolved`), `type` (`feedback` | `complaint`) and subject/message `search` filters.
Each row includes the full submission plus a safe author object
(`{ id, name, email }`).

```
200 { "data": [...], "meta": {...} }
```

### `GET /api/admin/feedback/:id`

```
200 { "data": {...} }
404 NOT_FOUND
```

### `PATCH /api/admin/feedback/:id`

Body `{ "status"?: "open" | "in_review" | "resolved", "adminNote"?: string (≤1000 chars) | null }`,
at least one key required. `adminNote` is internal - it is stored and returned on
the admin endpoints but never exposed on the user's own `/api/feedback/*` endpoints.

```
200 { "data": {...} }
400 VALIDATION_ERROR
404 NOT_FOUND
```
