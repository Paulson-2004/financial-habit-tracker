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
  completion date, goal contribution date, snapshot date).
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

## Implemented (Day 4) - `004_create_wealth_tracking.sql`

The balance sheet (see `docs/business-rules.md` section 1, the three-ledger model). Net
worth is derived **only** from `assets`/`liabilities` - never from `transactions` or
`goal_contributions`. No `currency` column on either table: the existing architecture
already treats currency as a per-**user** setting (`financial_profiles.currency`), not a
per-record one - `transactions` and `savings_goals` don't carry one either, so adding it
only here would be a new, inconsistent pattern.

### `assets`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE | |
| `name` | VARCHAR(100) | `CHECK (char_length(btrim(name)) >= 2)` |
| `category` | VARCHAR(20) | `CHECK (category IN ('cash','bank_account','fixed_deposit','stocks','mutual_funds','gold','property','vehicle','other'))`, default `'other'` |
| `value` | NUMERIC(14,2) | `CHECK (value > 0)` - current value, not a cost basis or purchase price |
| `description` | VARCHAR(255) | nullable |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

Index: `(user_id)`.

### `liabilities`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE | |
| `name` | VARCHAR(100) | `CHECK (char_length(btrim(name)) >= 2)` |
| `category` | VARCHAR(20) | `CHECK (category IN ('credit_card','personal_loan','education_loan','vehicle_loan','home_loan','other'))`, default `'other'` |
| `amount` | NUMERIC(14,2) | `CHECK (amount > 0)` - the current outstanding balance owed, not an original principal or a repayment schedule (no loan amortization - see `AGENTS.md` section 22) |
| `description` | VARCHAR(255) | nullable |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

Index: `(user_id)`.

### `net_worth_snapshots`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID, FK -> `users(id)` ON DELETE CASCADE | |
| `snapshot_date` | DATE | always the server's UTC "today" at the moment the snapshot is recorded - never a client-supplied or backdated value (a snapshot represents *current* totals, so backdating them would misrepresent history) |
| `total_assets` | NUMERIC(16,2) | `CHECK (>= 0)`; computed server-side from the user's current `assets` rows, never client-supplied |
| `total_liabilities` | NUMERIC(16,2) | `CHECK (>= 0)`; computed server-side from the user's current `liabilities` rows |
| `net_worth` | NUMERIC(16,2) | `GENERATED ALWAYS AS (total_assets - total_liabilities) STORED` - can never drift from the two columns it's derived from |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

`UNIQUE (user_id, snapshot_date)` - one snapshot per user per calendar day. A second
snapshot recorded on the same day **upserts** (`ON CONFLICT (user_id, snapshot_date) DO
UPDATE ...`) rather than erroring or creating a duplicate row, so refreshing today's
snapshot after adding another asset is a normal, expected action, not a conflict. This
constraint's own index also serves "this user's history, ordered by date" queries, so no
separate index is needed.

## Tables deliberately not created

See `AGENTS.md` section 22 and the architecture blueprint's "Necessary vs avoided"
table - notably: no `budgets` table (one column on `financial_profiles` instead), no
auth/session/permission tables (a `role` column is enough for two roles), no audit log or
soft-delete columns, no recurring-transaction or price-history tables. `categories` is
schema-ready for user-created custom categories (a nullable `user_id`), but no endpoint
creates one yet - adding that is a later, explicitly scoped decision, not an assumed
future feature. No habit "target/value" or reminder-time column either (Day 3's field
list didn't call for them and no Day 3 UI would use them - see the original PRD's "habit
reminders" item, still unscheduled). No asset cost-basis, purchase-date, or price-history
columns either - `assets.value` is just the current value the user entered; computing a
gain/loss or tracking price history is investment-tracking functionality explicitly out
of scope (see `AGENTS.md` section 1 and 22).
