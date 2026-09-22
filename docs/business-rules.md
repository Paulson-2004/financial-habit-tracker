# Business rules

This document is the source of truth for how the app calculates anything financial. If
you change a calculation, update this file and its test in the same change (see
`AGENTS.md` section 8).

## Status

No financial calculations exist yet - Day 1 only builds authentication and the project
foundation. The two rules below are already in effect because they shape the schema and
must not be violated by anything built later. Everything else in this file will be
filled in, section by section, as each feature is implemented (Days 2-4), so that this
file always matches the code that actually exists rather than describing work not yet
done.

## 1. The three-ledger model (in effect now)

Money is tracked in three independent ledgers. They must never be mixed or
double-counted, and no calculation may silently move a value from one ledger into
another:

1. **Cash flow ledger** - income and expenses (`transactions`, from Day 2).
2. **Goals ledger** - savings goals and their contributions (`savings_goals` +
   `goal_contributions`, from Day 3).
3. **Balance sheet** - assets and liabilities, i.e. net worth (`assets` + `liabilities`,
   from Day 4).

Concretely, once these tables exist: a goal contribution is never turned into an
automatic expense row, and creating or updating an asset never creates an automatic
income row. Each ledger is written to only by its own explicit user action.

## 2. Not a financial advisor (in effect now, and permanently)

The app only tracks and reports what the user entered. It never generates
recommendations, "you should..." copy, or projections/forecasts. Where a status label is
useful (e.g. a budget's `on_track` / `near_limit` / `over_budget`), it is a plain
description of the numbers, not advice.

## 3-14. To be added as each feature is built

The following sections will be added here, each in the change that implements it, with
the exact formula, rounding rule, and edge-case table:

- Total income / total expenses / net savings / savings rate (Day 2)
- Budget status and monthly comparison (Day 2)
- Habit completion rate, current streak, longest streak (Day 3)
- Savings goal progress, overfunding, and status (Day 3)
- Total assets / total liabilities / net worth / net worth change (Day 4)
- Investment gain (only for assets with a recorded cost basis) (Day 4)
- Monthly financial summary composition (Day 2/4)

Each section will also list its edge cases explicitly (zero income, a deleted
transaction, a future-dated transaction, an incomplete habit for "today", a missed habit
day, a goal contribution that exceeds the target, a negative or invalid amount, and so
on) and state the exact resulting behavior - not just "handled correctly."
