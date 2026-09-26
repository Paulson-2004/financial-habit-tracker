# Business rules

This document is the source of truth for how the app calculates anything financial. If
you change a calculation, update this file and its test in the same change (see
`AGENTS.md` section 8).

## Status

Days 1-3 are implemented. Sections 3-9 below are live and tested (see
`server/tests/unit/summaryCalc.test.js`, `streaksCalc.test.js`, `goalsCalc.test.js`,
`dates.test.js`, and the corresponding integration suites). Section 10+ describes work
not yet built - Day 4 - so this file always matches the code that actually exists.

## 1. The three-ledger model (in effect now)

Money is tracked in three independent ledgers. They must never be mixed or
double-counted, and no calculation may silently move a value from one ledger into
another:

1. **Cash flow ledger** - income and expenses (`transactions`, implemented Day 2).
2. **Goals ledger** - savings goals and their contributions (`savings_goals` +
   `goal_contributions`, implemented Day 3).
3. **Balance sheet** - assets and liabilities, i.e. net worth (`assets` + `liabilities`,
   from Day 4).

Concretely: a goal contribution is never turned into an automatic expense row (adding one
writes only to `goal_contributions` - see `goalService.js#addContribution`), and creating
or updating an asset (Day 4) will never create an automatic income row. Each ledger is
written to only by its own explicit user action.

## 2. Not a financial advisor (in effect now, and permanently)

The app only tracks and reports what the user entered. It never generates
recommendations, "you should..." copy, or projections/forecasts. The monthly summary
(section 4) and goal progress (section 8) report plain numbers and status labels only -
no advice is generated from them.

## 3. Transaction amounts and types (implemented, Day 2)

A transaction's `amount` is always stored and validated as a positive number (`amount >
0` is a database `CHECK` as well as a Zod rule) - there is no signed/negative
representation of an expense. Whether an amount counts toward income or expenses is
determined entirely by its `type` column (`'income'` or `'expense'`), never by the sign
of the number. A transaction's `category_id` must reference a category whose own `type`
matches the transaction's `type` - enforced both by a composite foreign key in the
database (`FOREIGN KEY (category_id, type) REFERENCES categories (id, type)`) and, for a
clearer error message, by a pre-check in `transactionService.js` that returns
`400 VALIDATION_ERROR` on the `categoryId` field before the write is attempted.

## 4. Monthly totals (implemented, Day 2)

For a given `YYYY-MM` month (default: the server's current UTC month):

- **Total income** = `SUM(amount)` over that user's transactions with `type = 'income'`
  and `transaction_date` in the month.
- **Total expenses** = the same with `type = 'expense'`.
- **Net savings** = `total income - total expenses`. Computed in
  `calc/summary.js#computeNetSavings` (a pure function, no DB access) from the two SQL
  sums above - never stored. **Can be negative** (a deficit) - it is never clamped to
  zero.
- **Savings rate** = `(net savings / total income) * 100`, rounded to 1 decimal place
  (`calc/summary.js#computeSavingsRate`). **When total income is 0, the rate is `null`**
  (never a division by zero, and never displayed as `0%`, which would misleadingly imply
  there was income to take a rate of). A rate of exactly `0` (income > 0, net savings = 0)
  is a real, valid rate and is returned as `0`, not `null` - the two cases are distinct.
- **Transaction count** = the count of transactions in the month (both types combined).

Test cases exercised in `server/tests/unit/summaryCalc.test.js` and
`server/tests/integration/transactions.test.js`:

| Income | Expenses | Net savings | Savings rate |
|---|---|---|---|
| 50,000 | 12,000 | 38,000 | 76 |
| 0 | 0 | 0 | `null` |
| 10,000 | 10,000 | 0 | 0 |
| 10,000 | 15,000 | -5,000 | -50 |

## 5. Category breakdown (implemented, Day 2)

For the same month, `incomeByCategory` and `expensesByCategory` each list every category
that had at least one transaction, with `amount` (the category's total for that type in
that month) and `percent` = `(category amount / that type's total) * 100`, rounded to 1
decimal (`calc/summary.js#computeCategoryPercent`). `percent` is `0` when the type's
total is `0` (an empty bucket can't have a share of nothing, but this never divides by
zero). A month with no transactions at all returns `incomeByCategory: []` and
`expensesByCategory: []`, and `income`/`expenses`/`netSavings` are all `0` with
`savingsRate: null`.

## 6. Shared date-range rule (implemented; Day 2 for transactions, Day 3 for habit
completions and goal contributions)

Every user-entered date in the app (`transactionDate`, a habit's `completion_date`, a
goal's `contribution_date`) is validated with the **same one rule**,
`isWithinAllowedDateRange` in `server/src/utils/dates.js`, so there is exactly one
future-date policy in the codebase, not one per feature:

- A real calendar date (`isValidCalendarDateString` rejects e.g. `2024-02-30`).
- On or after `2000-01-01` (anything earlier is almost certainly a typo).
- **At most one day ahead of the server's UTC "today."** The one day of slack exists
  because a client in a timezone ahead of UTC can have a local calendar date that is
  already "tomorrow" in UTC; without it, a legitimate same-day entry near midnight could
  be wrongly rejected as "future-dated." Anything further in the future is rejected with
  `400 VALIDATION_ERROR`.

A savings goal's `targetDate` is validated differently - see section 8.

## 7. Habit streaks (implemented, Day 3)

Habits are daily-only for the MVP (`habits.frequency` is constrained to `'daily'` - see
`docs/database.md`). All streak logic is in `calc/streaks.js`, pure functions with no
database access, computed fresh from a habit's completion dates on every read - nothing
is stored.

- **`completedToday`** = whether "today" is in the habit's completion dates.
- **Current streak** = the number of consecutive completed days ending at "today" if
  today is completed, otherwise ending at "yesterday." An incomplete "today" never breaks
  a streak by itself - it simply isn't counted yet. If neither today nor yesterday is
  completed, the streak has lapsed and is `0`.
- **Longest streak** = the longest run of consecutive calendar dates anywhere in the
  completion history, not just the run touching "today." It never decreases when the
  current streak later breaks.
- **"Today"** is always the value passed in `?today=` (`GET /api/habits`, and both
  completion endpoints), which the client sends as **its own local calendar date**, not
  the server's UTC date - this is what keeps streaks correct for a user in a timezone far
  from UTC. It defaults to the server's UTC date only if omitted.
- Marking a **backdated** completion (a `date` in the past) never changes what "today"
  means for the streak calculation in that same response - `today` and `date` are always
  two independent values, never conflated. See `habitService.js#markCompletion`.
- **Duplicate completions**: `POST .../completions` is idempotent (the database has
  `UNIQUE (habit_id, completion_date)`, and the insert uses `ON CONFLICT ... DO NOTHING`)
  - completing an already-completed date is a no-op, not an error. Undoing a completion
    that doesn't exist, however, **is** a `404` - "undo" has nothing to be idempotent
    about.

Test cases exercised in `server/tests/unit/streaksCalc.test.js` and
`server/tests/integration/habits.test.js` (dates abbreviated to day-of-month for
brevity, all within March 2026):

| Completions | "Today" | Current streak | Longest streak |
|---|---|---|---|
| (none) | 5 | 0 | 0 |
| 1, 2, 3 | 3 | 3 | 3 |
| 1, 2, 4 (a missing day) | 4 | 1 | 2 |
| 1, 2, 4 | 6 (streak lapsed) | 0 | 2 |
| 1, 2 | 3 (today not yet marked) | 2 | 2 |

## 8. Savings goal progress and status (implemented, Day 3)

All goal math is in `calc/goals.js`, pure functions with no database access. A goal's
`contributedAmount` is always `SUM(amount)` over its `goal_contributions` - never stored
independently, so it can never drift out of sync.

- **Remaining amount** = `max(0, targetAmount - contributedAmount)` - **never negative**.
  An overfunded goal has nothing left to save, not a negative requirement.
- **Progress percent** = `min(100, (contributedAmount / targetAmount) * 100)`, rounded to
  1 decimal, **capped at 100** for display. `0` (never a division error) when
  `targetAmount` is `0` - Zod already rejects a non-positive target at creation, but the
  pure function is defensively safe regardless.
- **Overfunded by** = `max(0, contributedAmount - targetAmount)` - how far past the
  target the goal is. The actual `contributedAmount` itself is **never clamped** - only
  `remainingAmount` and `progressPercent` are capped for safe display.
- **Status**: `'completed'` once `contributedAmount >= targetAmount` (checked first, so a
  goal completed after its deadline is `'completed'`, not `'overdue'`); else `'overdue'`
  if `targetDate` is set and has passed; else `'in_progress'`.
- **`targetDate` validation differs between create and update**: on `POST /api/goals`, a
  target date must be today or later - creating a goal that's already overdue makes no
  sense. On `PUT /api/goals/:id`, no such check is applied - an existing goal's deadline
  naturally moves into the past as time passes, and that is exactly what `'overdue'`
  status means, not a data error that should block editing an unrelated field.

Test cases (spec examples) exercised in `server/tests/unit/goalsCalc.test.js` and
`server/tests/integration/goals.test.js`:

| Target | Contributions | Contributed | Remaining | Progress | Status |
|---|---|---|---|---|---|
| 100,000 | 20,000 + 30,000 | 50,000 | 50,000 | 50% | in_progress |
| 100,000 | 120,000 | 120,000 | 0 (not negative) | 100% (capped) | completed |
| 100,000 | (none) | 0 | 100,000 | 0% | in_progress |

## 9. Ownership rules for Day 3 resources (implemented)

- A habit is reached only by `WHERE id = $1 AND user_id = $2`. `habit_completions` has no
  `user_id` column of its own - every completion function in `habitService.js` calls
  `assertHabitOwnership` first, so a completion is never read or written using a
  `habitId` that doesn't already belong to the requesting user.
- A goal is reached only by `WHERE id = $1 AND user_id = $2`. `goal_contributions`
  carries its **own** `user_id` column (set from the session at insert time, never from
  client input) specifically so its queries can filter with
  `WHERE goal_id = $1 AND user_id = $2` directly, without relying on a join alone.
- In both cases, "not found" and "belongs to someone else" are indistinguishable
  (`404 NOT_FOUND`) - see `AGENTS.md` section 7.

## Edge cases (implemented)

| Case | Behavior |
|---|---|
| Zero income for the month | Savings rate is `null`; net savings = `-expenses` |
| A transaction deleted mid-month | Totals are always computed live - there is no cached aggregate to go stale |
| A future-dated transaction, completion, or contribution | Rejected at create/update time (section 6) - never silently clamped |
| A negative or zero amount (transaction, contribution) | Rejected (`> 0` at both the Zod and database `CHECK` layers) |
| More than 2 decimal places | Rejected by Zod before it reaches the database |
| `categoryId` whose `type` doesn't match the transaction's `type` | Rejected with `400 VALIDATION_ERROR` on the `categoryId` field (section 3) |
| A month with no transactions | Zeros and empty category arrays (section 5), not an error |
| Filtering by `month` together with `startDate`/`endDate` | `month` takes precedence; the explicit range is ignored (see `docs/api.md`) |
| A habit with no completions | `completedToday: false`, both streaks `0` |
| Completing an already-completed date | No-op (`200`), not an error - see section 7 |
| Undoing a completion that doesn't exist | `404 NOT_FOUND` - not idempotent |
| A goal with no contributions | `contributedAmount: 0`, `progressPercent: 0`, status `'in_progress'` (unless overdue) |
| Contributions exceeding the target | `remainingAmount` stays `0`, `progressPercent` caps at 100, `contributedAmount` and `overfundedBy` show the true numbers (section 8) |
| Editing a goal whose target date has already passed | Allowed - only `POST` (create) rejects a past target date (section 8) |
| Zero or negative goal target amount | Rejected by Zod (`targetAmount > 0`) on both create and update |

## 10+. To be added as each feature is built

The following remain unimplemented and will be added here, each in the change that
implements it, with the exact formula, rounding rule, and edge-case table:

- Total assets / total liabilities / net worth / net worth change (Day 4)
- Investment gain (only for assets with a recorded cost basis) (Day 4)
- Budget status (`monthlyBudget` vs. actual expenses) and a previous-month comparison -
  the `financial_profiles.monthly_budget` column exists (Day 1) but no endpoint reads it
  yet; this was deliberately deferred rather than added speculatively ahead of the UI (a
  budget bar) that would use it
