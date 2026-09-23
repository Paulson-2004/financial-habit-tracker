-- 001_categories.sql
-- System categories available to every user (user_id IS NULL). Idempotent: safe to
-- re-run (npm run seed can be run again) thanks to the partial unique index added in
-- 002_create_financial_ledger.sql.

INSERT INTO categories (name, type, color) VALUES
  ('Salary', 'income', '#16a34a'),
  ('Freelance', 'income', '#22c55e'),
  ('Business', 'income', '#4ade80'),
  ('Investment Returns', 'income', '#86efac'),
  ('Gift', 'income', '#bbf7d0'),
  ('Other Income', 'income', '#059669'),
  ('Housing', 'expense', '#dc2626'),
  ('Utilities', 'expense', '#ea580c'),
  ('Groceries', 'expense', '#f97316'),
  ('Transportation', 'expense', '#fb923c'),
  ('Dining Out', 'expense', '#f59e0b'),
  ('Healthcare', 'expense', '#eab308'),
  ('Education', 'expense', '#84cc16'),
  ('Shopping', 'expense', '#ef4444'),
  ('Entertainment', 'expense', '#e11d48'),
  ('Insurance', 'expense', '#be123c'),
  ('Debt Payments', 'expense', '#9f1239'),
  ('Other', 'expense', '#78716c')
ON CONFLICT (name, type) WHERE user_id IS NULL DO NOTHING;
