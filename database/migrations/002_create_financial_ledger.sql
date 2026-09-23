-- 002_create_financial_ledger.sql
-- Day 2: the cash flow ledger (see docs/business-rules.md section 1, the three-ledger
-- model). Adds categories, transactions, and feedback. Conventions follow
-- 001_create_users.sql (see its header) plus:
--   * a composite FK (category_id, type) -> categories(id, type) guarantees a
--     transaction's type always matches its category's type, enforced by the database
--     itself, not only by the API.

CREATE TABLE categories (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = a system category available to every user. A non-NULL value is reserved for a
  -- future per-user custom category feature; Day 2 only reads/seeds system categories.
  user_id    UUID         REFERENCES users (id) ON DELETE CASCADE,
  name       VARCHAR(50)  NOT NULL CHECK (char_length(btrim(name)) >= 1),
  type       VARCHAR(7)   NOT NULL CHECK (type IN ('income', 'expense')),
  color      VARCHAR(7)   NOT NULL DEFAULT '#64748b' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Lets transactions declare FOREIGN KEY (category_id, type) REFERENCES categories (id, type).
  CONSTRAINT categories_id_type_key UNIQUE (id, type)
);

-- Prevents seeding (or later, a user creating) the same system category twice.
CREATE UNIQUE INDEX categories_system_name_type_key
  ON categories (name, type) WHERE user_id IS NULL;

CREATE INDEX categories_user_idx ON categories (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE transactions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id      UUID          NOT NULL,
  type             VARCHAR(7)    NOT NULL CHECK (type IN ('income', 'expense')),
  amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description      VARCHAR(200),
  transaction_date DATE          NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  FOREIGN KEY (category_id, type) REFERENCES categories (id, type)
);

-- Covers "list my transactions, newest first" and the month-range summary query.
CREATE INDEX transactions_user_date_idx ON transactions (user_id, transaction_date DESC);
-- Covers filtering by type within a date range (e.g. "this month's expenses").
CREATE INDEX transactions_user_type_date_idx ON transactions (user_id, type, transaction_date);
CREATE INDEX transactions_category_idx ON transactions (category_id);

CREATE TABLE feedback (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       VARCHAR(10)  NOT NULL CHECK (type IN ('feedback', 'complaint')),
  subject    VARCHAR(150) NOT NULL CHECK (char_length(btrim(subject)) >= 3),
  message    TEXT         NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status     VARCHAR(10)  NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved')),
  -- Reserved for the Day 5 admin panel; no Day 2 endpoint reads or writes this column.
  admin_note TEXT CHECK (char_length(admin_note) <= 1000),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX feedback_user_idx ON feedback (user_id, created_at DESC);
