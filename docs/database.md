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

## Implemented (Day 2) - `002_create_financial_ledger.sql`

The cash flow ledger (see `docs/business-rules.md` section 1, the three-ledger model).

### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE, nullable | `NULL` = a system category available to everyone. Non-`NULL` is reserved for a future per-user custom-category feature; Day 2 only reads/seeds system categories - nothing creates a non-NULL row yet |
| `name` | VARCHAR(50) | `CHECK (char_length(btrim(name)) >= 1)` |
| `type` | VARCHAR(7) | `CHECK (type IN ('income','expense'))` |
| `color` | VARCHAR(7) | hex color, default `'#64748b'`, `CHECK (color ~ '^#[0-9a-fA-F]{6}$')` |
| `created_at` | TIMESTAMPTZ | |

`UNIQUE (id, type)` lets `transactions` declare a composite foreign key back to this
table, so a transaction's `type` can never disagree with its own category's `type` - the
database enforces this, not only the API. A partial unique index,
`categories_system_name_type_key` on `(name, type) WHERE user_id IS NULL`, stops the same
system category from being seeded twice; `database/seeds/001_categories.sql` relies on it
for its `ON CONFLICT ... DO NOTHING`.

### `transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE | every query filters on this - see `AGENTS.md` section 5 |
| `category_id` | UUID | part of the composite FK `(category_id, type) REFERENCES categories (id, type)` |
| `type` | VARCHAR(7) | `CHECK (type IN ('income','expense'))` |
| `amount` | NUMERIC(14,2) | `CHECK (amount > 0)` - always positive; `type` determines whether it's income or an expense, never a signed number |
| `description` | VARCHAR(200) | nullable |
| `transaction_date` | DATE | validated server-side against the future-date rule - see `docs/business-rules.md` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

Indexes: `(user_id, transaction_date DESC)` for "list my transactions, newest first" and
month-range queries; `(user_id, type, transaction_date)` for filtering by type within a
range; `(category_id)` for the category-breakdown aggregate.

### `feedback`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE | |
| `type` | VARCHAR(10) | `CHECK (type IN ('feedback','complaint'))` |
| `subject` | VARCHAR(150) | `CHECK (char_length(btrim(subject)) >= 3)` |
| `message` | TEXT | `CHECK (char_length(message) BETWEEN 10 AND 2000)` |
| `status` | VARCHAR(10) | `CHECK (status IN ('open','in_review','resolved'))`, default `'open'` - no Day 2 endpoint changes this |
| `admin_note` | TEXT, nullable | `CHECK (char_length(admin_note) <= 1000)` - reserved for the Day 5 admin panel; no Day 2 endpoint reads or writes it |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

Index: `(user_id, created_at DESC)` for "my feedback, newest first".

### System category seed - `database/seeds/001_categories.sql`

Run by `npm run seed` (and automatically by the integration test suite's database reset -
see `server/tests/helpers/testDb.js`). 6 income categories (Salary, Freelance, Business,
Investment Returns, Gift, Other Income) and 12 expense categories (Housing, Utilities,
Groceries, Transportation, Dining Out, Healthcare, Education, Shopping, Entertainment,
Insurance, Debt Payments, Other). The `INSERT ... ON CONFLICT (name, type) WHERE user_id
IS NULL DO NOTHING` makes it safe to run more than once.

## Implemented (Day 3) - `003_create_habits_and_goals.sql`

The goals ledger, plus financial habits (see `docs/business-rules.md` section 1, the
three-ledger model - goal contributions are independent of the cash flow ledger above and
never create a transaction automatically).

### `habits`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE | |
| `name` | VARCHAR(100) | `CHECK (char_length(btrim(name)) >= 2)` |
| `description` | VARCHAR(255) | nullable |
| `category` | VARCHAR(20) | `CHECK (category IN ('saving','budgeting','investing','other'))`, default `'other'` - a loose theme for display only; nothing branches on it |
| `frequency` | VARCHAR(10) | `CHECK (frequency = 'daily')`, default `'daily'` - the Day 3 MVP is daily-only (see `AGENTS.md` section 22); the column exists for a future weekly/monthly feature, but that would need a new migration to widen the `CHECK`, not a Day 3 change |
| `is_active` | BOOLEAN | default `TRUE` - reserved for a future pause/resume feature; no Day 3 endpoint changes this after creation |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

Index: `(user_id)`.

### `habit_completions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `habit_id` | UUID, FK -> `habits(id)` ON DELETE CASCADE | no separate `user_id` column - the owner is reached via `habit_id -> habits.user_id`, so `UNIQUE (habit_id, completion_date)` already means "unique per user + habit + date" |
| `completion_date` | DATE | validated server-side with the same date-range rule as transactions (see `docs/business-rules.md`) |
| `created_at` | TIMESTAMPTZ | |

`UNIQUE (habit_id, completion_date)` is what makes "mark complete" idempotent - the
service issues `INSERT ... ON CONFLICT (habit_id, completion_date) DO NOTHING`, so
completing an already-completed date is a no-op rather than an error.

### `savings_goals`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE | |
| `name` | VARCHAR(100) | `CHECK (char_length(btrim(name)) >= 2)` |
| `description` | VARCHAR(255) | nullable |
| `target_amount` | NUMERIC(14,2) | `CHECK (target_amount > 0)` |
| `target_date` | DATE, nullable | optional deadline; no database `CHECK` against "today" - only enforced on create, server-side (see `docs/business-rules.md`) - an existing goal's date naturally moves into the past over time, which is what 'overdue' status means, not a data error |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

No `status` column - progress and status are always derived from contributions at read
time (`calc/goals.js`), never stored, so they can't drift out of sync. Index: `(user_id)`.

### `goal_contributions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `goal_id` | UUID, FK -> `savings_goals(id)` ON DELETE CASCADE | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE | set from the authenticated session at insert time, never from client input; kept as its own column (in addition to `goal_id -> savings_goals.user_id`) so ownership queries can filter directly with `WHERE goal_id = $1 AND user_id = $2` - see `AGENTS.md` section 7 |
| `amount` | NUMERIC(14,2) | `CHECK (amount > 0)` |
| `contribution_date` | DATE | same date-range rule as transactions/completions |
| `note` | VARCHAR(200), nullable | |
| `created_at` | TIMESTAMPTZ | |

Index: `(goal_id, contribution_date DESC)` for a goal's contribution history, newest first.

## Planned for later days (not yet migrated)

Recorded here so the shape is known in advance; each is added via its own numbered
migration on the day it's needed, not created empty ahead of time.

| Table | Added | Purpose |
|---|---|---|
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
soft-delete columns, no recurring-transaction or price-history tables. `categories` is
schema-ready for user-created custom categories (a nullable `user_id`), but no endpoint
creates one yet - adding that is a later, explicitly scoped decision, not an assumed
future feature. No habit "target/value" or reminder-time column either (Day 3's field
list didn't call for them and no Day 3 UI would use them - see the original PRD's "habit
reminders" item, still unscheduled).
