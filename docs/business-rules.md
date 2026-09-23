# Business rules

This document is the source of truth for how the app calculates anything financial. If
you change a calculation, update this file and its test in the same change (see
`AGENTS.md` section 8).

# Business rules

This document is the source of truth for how the app calculates anything financial. If
you change a calculation, update this file and its test in the same change (see
`AGENTS.md` section 8).

## Status

Days 1-2 are implemented. Sections 3-6 below are live and tested (see
`server/tests/unit/summaryCalc.test.js`, `dates.test.js`, and
`server/tests/integration/transactions.test.js`). Sections 7+ describe work not yet
built - Days 3-4 - so this file always matches the code that actually exists.

## 1. The three-ledger model (in effect now)

Money is tracked in three independent ledgers. They must never be mixed or
double-counted, and no calculation may silently move a value from one ledger into
another:

1. **Cash flow ledger** - income and expenses (`transactions`, implemented Day 2).
2. **Goals ledger** - savings goals and their contributions (`savings_goals` +
   `goal_contributions`, from Day 3).
3. **Balance sheet** - assets and liabilities, i.e. net worth (`assets` + `liabilities`,
   from Day 4).

Concretely: a goal contribution (once it exists, Day 3) will never be turned into an
automatic expense row, and creating or updating an asset (Day 4) will never create an
automatic income row. Each ledger is written to only by its own explicit user action.

## 2. Not a financial advisor (in effect now, and permanently)

The app only tracks and reports what the user entered. It never generates
recommendations, "you should..." copy, or projections/forecasts. The Day 2 monthly
summary (section 4 below) reports plain numbers only - no budget-vs-actual commentary is
generated from them.

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

## 6. Transaction date validation (implemented, Day 2)

A transaction's `transactionDate` must be:

- A real calendar date (`isValidCalendarDateString` rejects e.g. `2024-02-30`).
- On or after `2000-01-01` (anything earlier is almost certainly a typo).
- **At most one day ahead of the server's UTC "today."** The one day of slack exists
  because a client in a timezone ahead of UTC can have a local calendar date that is
  already "tomorrow" in UTC; without it, a legitimate same-day entry near midnight could
  be wrongly rejected as "future-dated." Anything further in the future is rejected with
  `400 VALIDATION_ERROR`. See `server/src/utils/dates.js#isWithinTransactionDateRange`
  and its unit tests for the exact boundary behavior.

This is the one and only future-date rule in the codebase - nothing overrides or
duplicates it with different bounds.

## Edge cases (implemented, Day 2)

| Case | Behavior |
|---|---|
| Zero income for the month | Savings rate is `null`; net savings = `-expenses` |
| A transaction deleted mid-month | Totals are always computed live from the `transactions` table on every read - there is no cached aggregate to go stale |
| A future-dated transaction | Rejected at create/update time (section 6) - never silently clamped to today |
| A negative or zero amount | Rejected (`amount > 0` at both the Zod and database `CHECK` layers) |
| More than 2 decimal places | Rejected by Zod before it reaches the database |
| `categoryId` whose `type` doesn't match the transaction's `type` | Rejected with `400 VALIDATION_ERROR` on the `categoryId` field (section 3) |
| A month with no transactions | Zeros and empty category arrays (section 5), not an error |
| Filtering by `month` together with `startDate`/`endDate` | `month` takes precedence; the explicit range is ignored (see `docs/api.md`) |

## 7+. To be added as each feature is built

The following remain unimplemented and will be added here, each in the change that
implements it, with the exact formula, rounding rule, and edge-case table:

- Habit completion rate, current streak, longest streak (Day 3)
- Savings goal progress, overfunding, and status (Day 3)
- Total assets / total liabilities / net worth / net worth change (Day 4)
- Investment gain (only for assets with a recorded cost basis) (Day 4)
- Budget status (`monthlyBudget` vs. actual expenses) and a previous-month comparison -
  the `financial_profiles.monthly_budget` column exists (Day 1) but no Day 2 endpoint
  reads it yet; this was deliberately deferred rather than added speculatively ahead of
  the UI (a budget bar) that would use it - see "Day 3 Preparation" in the Day 2
  implementation report for the reasoning

