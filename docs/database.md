# Database

PostgreSQL 13+. All schema changes are migration files in `database/migrations/`,
applied in filename order by `npm run migrate` (`server/src/db/migrate.js`). Each
migration runs in its own transaction and is recorded in an auto-created
`schema_migrations` table, so it's safe to run `npm run migrate` repeatedly (already
applied files are skipped).

**Conventions used throughout the schema** (see also `AGENTS.md` section 5):

- `UUID PRIMARY KEY DEFAULT gen_random_uuid()` on every table.
- `TIMESTAMPTZ NOT NULL DEFAULT now()` for `created_at`/`updated_at` (`updated_at` is set
  by application code on update, not a trigger).
- `DATE` (never `TIMESTAMPTZ`) for calendar-day fields (transaction date, habit
  completion date, goal contribution date, snapshot month).
- `NUMERIC(14,2)` (or `NUMERIC(16,2)` for the larger net-worth totals) for every monetary
  value - never a floating-point type.
- `CHECK` constraints for enumerations instead of PostgreSQL `ENUM` types, so adding a
  new allowed value is a migration that alters a constraint, not a type-wide change.
- Every user-owned table has `user_id UUID NOT NULL REFERENCES users(id) ON DELETE
  CASCADE`.

## Implemented (Day 1) - `001_create_users.sql`

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | VARCHAR(80) | `CHECK (char_length(btrim(name)) >= 2)` |
| `email` | VARCHAR(254) | `UNIQUE`; `CHECK (email = lower(email))` - the app always lowercases before insert (see `validators/common.js`), and this constraint stops any code path from bypassing that, so the plain `UNIQUE` index alone gives case-insensitive uniqueness |
| `password_hash` | VARCHAR(100) | bcrypt hash, never returned by any query |
| `role` | VARCHAR(10) | `CHECK (role IN ('user','admin'))`, default `'user'` |
| `is_active` | BOOLEAN | default `TRUE`; set `FALSE` to disable an account (checked on every authenticated request) |
| `last_login_at` | TIMESTAMPTZ | nullable, set on successful login |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

### `financial_profiles` (1:1 with `users`)

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID PK, FK -> `users(id)` ON DELETE CASCADE | one row per user, created at registration |
| `currency` | CHAR(3) | `CHECK (currency ~ '^[A-Z]{3}$')`, default `'INR'` |
| `occupation` | VARCHAR(80) | nullable |
| `monthly_budget` | NUMERIC(14,2) | nullable, `CHECK (>= 0)` |
| `monthly_savings_target` | NUMERIC(14,2) | nullable, `CHECK (>= 0)` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

A profile is created in the same database transaction as the user, both at registration
(`authService.register`) and by the admin seed script (`seedAdmin` in `db/seed.js`) -
there is never a user without a profile.

## Planned for later days (not yet migrated)

Recorded here so the shape is known in advance; each is added via its own numbered
migration on the day it's needed, not created empty ahead of time.

| Table | Added | Purpose |
|---|---|---|
| `categories` | Day 2 | System + user-defined income/expense categories |
| `transactions` | Day 2 | Cash flow ledger (income and expenses) |
| `feedback` | Day 2 | User feedback/complaints |
| `habits` | Day 3 | Daily financial habits |
| `habit_completions` | Day 3 | One row per completed day per habit |
| `savings_goals` | Day 3 | Goals ledger |
| `goal_contributions` | Day 3 | Contributions toward a goal |
| `assets` | Day 4 | Manually tracked assets/investments (balance sheet) |
| `liabilities` | Day 4 | Manually tracked liabilities (balance sheet) |
| `net_worth_snapshots` | Day 4 | One row per user per month; the only stored aggregate, re-derived from `assets`/`liabilities` on every write |

Full column-level design for these tables is in the architecture blueprint from planning
(shared separately) and will be copied into this file as each migration lands, so this
document always matches the database that actually exists.

## Tables deliberately not created

See `AGENTS.md` section 22 and the architecture blueprint's "Necessary vs avoided"
table - notably: no `budgets` table (one column on `financial_profiles` instead), no
auth/session/permission tables (a `role` column is enough for two roles), no audit log or
soft-delete columns, no recurring-transaction or price-history tables.
