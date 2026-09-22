-- 001_create_users.sql
-- Authentication foundation: users and their financial profile.
--
-- Conventions used by every migration in this project:
--   * UUID primary keys via gen_random_uuid() (built in from PostgreSQL 13)
--   * TIMESTAMPTZ for all timestamps
--   * NUMERIC(14,2) for money (never FLOAT/REAL/DOUBLE PRECISION)
--   * CHECK constraints for enumerations (no PostgreSQL ENUM types)
--   * user-owned tables carry a user_id foreign key with ON DELETE CASCADE
--
-- Each migration file runs inside a single transaction (see server/src/db/migrate.js),
-- so do not use statements that cannot run in a transaction (e.g. CREATE INDEX CONCURRENTLY).

CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(80)  NOT NULL CHECK (char_length(btrim(name)) >= 2),
  email         VARCHAR(254) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email))
);

-- One row per user. Created together with the user at registration.
CREATE TABLE financial_profiles (
  user_id                UUID          PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  currency               CHAR(3)       NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  occupation             VARCHAR(80),
  monthly_budget         NUMERIC(14,2) CHECK (monthly_budget >= 0),
  monthly_savings_target NUMERIC(14,2) CHECK (monthly_savings_target >= 0),
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now()
);
