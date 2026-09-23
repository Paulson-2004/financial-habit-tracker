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

## Planned for later days (not yet migrated)

Recorded here so the shape is known in advance; each is added via its own numbered
migration on the day it's needed, not created empty ahead of time.

| Table | Added | Purpose |
|---|---|---|
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
soft-delete columns, no recurring-transaction or price-history tables. As of Day 2,
`categories` is schema-ready for user-created custom categories (a nullable `user_id`),
but no endpoint creates one yet - adding that is a later, explicitly scoped decision, not
an assumed Day 3+ feature.
