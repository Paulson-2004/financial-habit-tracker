-- 003_create_habits_and_goals.sql
-- Day 3: the goals ledger (savings_goals, goal_contributions) plus financial habits
-- (habits, habit_completions). See docs/business-rules.md section 1 (the three-ledger
-- model) - goal contributions are independent of the cash flow ledger from
-- 002_create_financial_ledger.sql and never create a transaction automatically.
-- Conventions follow 001_create_users.sql and 002_create_financial_ledger.sql.

CREATE TABLE habits (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) >= 2),
  description VARCHAR(255),
  -- Loose theme for display only (see the PRD's saving/budgeting/investing habit
  -- examples) - nothing in the app branches on this value.
  category    VARCHAR(20)  NOT NULL DEFAULT 'other'
                CHECK (category IN ('saving', 'budgeting', 'investing', 'other')),
  -- Day 3 MVP supports daily habits only (see AGENTS.md section 22) - the column exists,
  -- as the architecture calls for, but its domain is deliberately a single value for now.
  -- Widening this to weekly/monthly is a later migration (a new CHECK), not a Day 3 change.
  frequency   VARCHAR(10)  NOT NULL DEFAULT 'daily' CHECK (frequency = 'daily'),
  -- Reserved for a future pause/resume feature - no Day 3 endpoint changes this after
  -- creation (see docs/database.md).
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX habits_user_idx ON habits (user_id);

CREATE TABLE habit_completions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id        UUID        NOT NULL REFERENCES habits (id) ON DELETE CASCADE,
  completion_date DATE        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One completion per habit per day. A habit's owner is reached via habit_id -> user_id,
  -- so this is equivalent to "unique per user + habit + date" without a redundant column.
  CONSTRAINT habit_completions_habit_date_key UNIQUE (habit_id, completion_date)
);

CREATE TABLE savings_goals (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name          VARCHAR(100)  NOT NULL CHECK (char_length(btrim(name)) >= 2),
  description   VARCHAR(255),
  target_amount NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  -- Optional deadline. No CHECK against "today" here - that is enforced only on create,
  -- server-side (see validators/goalValidators.js); a still-open goal's date naturally
  -- moves into the past over time, which is exactly what the 'overdue' status means, not
  -- a data error the database should reject.
  target_date   DATE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
  -- No status column: progress/status is always derived from contributions at read time
  -- (see calc/goals.js) rather than stored, so it can never drift out of sync.
);

CREATE INDEX savings_goals_user_idx ON savings_goals (user_id);

CREATE TABLE goal_contributions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id           UUID          NOT NULL REFERENCES savings_goals (id) ON DELETE CASCADE,
  -- Set from the authenticated session at insert time, never from client input. Kept as
  -- its own column (in addition to the goal_id -> user_id relationship) so ownership
  -- queries can filter directly with WHERE goal_id = $1 AND user_id = $2 - see AGENTS.md
  -- section 7 and docs/api.md.
  user_id           UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  contribution_date DATE          NOT NULL,
  note              VARCHAR(200),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX goal_contributions_goal_idx ON goal_contributions (goal_id, contribution_date DESC);
