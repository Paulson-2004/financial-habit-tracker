-- 004_create_wealth_tracking.sql
-- Day 4: the balance sheet (assets, liabilities) and net worth snapshots. See
-- docs/business-rules.md section 1 (the three-ledger model) - net worth is derived only
-- from assets/liabilities, never from transactions or goal_contributions, and a goal
-- contribution is never double-counted as an asset unless the user separately records
-- the resulting money as one. Conventions follow 001-003.
--
-- No currency column here: the existing architecture already treats currency as a
-- per-USER setting (financial_profiles.currency), not a per-record one - transactions
-- and goals don't carry a currency either. Adding it only here would be a new,
-- inconsistent pattern.

CREATE TABLE assets (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        VARCHAR(100)  NOT NULL CHECK (char_length(btrim(name)) >= 2),
  category    VARCHAR(20)   NOT NULL DEFAULT 'other'
                CHECK (category IN (
                  'cash', 'bank_account', 'fixed_deposit', 'stocks', 'mutual_funds',
                  'gold', 'property', 'vehicle', 'other'
                )),
  value       NUMERIC(14,2) NOT NULL CHECK (value > 0),
  description VARCHAR(255),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX assets_user_idx ON assets (user_id);

CREATE TABLE liabilities (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        VARCHAR(100)  NOT NULL CHECK (char_length(btrim(name)) >= 2),
  category    VARCHAR(20)   NOT NULL DEFAULT 'other'
                CHECK (category IN (
                  'credit_card', 'personal_loan', 'education_loan', 'vehicle_loan',
                  'home_loan', 'other'
                )),
  -- The current outstanding balance owed - not an original loan principal or a
  -- repayment schedule. This is tracking only; see AGENTS.md section 22 (no loan
  -- amortization or banking integration).
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description VARCHAR(255),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX liabilities_user_idx ON liabilities (user_id);

-- A snapshot always reflects the user's CURRENT assets/liabilities totals at the moment
-- it's recorded (see wealthService.js#recordSnapshot) - never derived from transactions,
-- and never backdated with today's totals under a past date (that would misrepresent
-- history, since net worth changes over time). One snapshot per user per calendar day:
-- recording a second one on the same day is a deliberate UPSERT (updates that day's
-- totals) rather than a duplicate row or a rejected request - see
-- db/queries/netWorthSnapshots.js.
CREATE TABLE net_worth_snapshots (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  snapshot_date     DATE          NOT NULL,
  total_assets      NUMERIC(16,2) NOT NULL CHECK (total_assets >= 0),
  total_liabilities NUMERIC(16,2) NOT NULL CHECK (total_liabilities >= 0),
  net_worth         NUMERIC(16,2) GENERATED ALWAYS AS (total_assets - total_liabilities) STORED,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT net_worth_snapshots_user_date_key UNIQUE (user_id, snapshot_date)
);
