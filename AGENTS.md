# AGENTS.md

This file tells AI coding agents (Claude Code, Codex, Gemini CLI, Cursor, Copilot, or any
other agentic tool) how to work safely on this repository. **Read this file in full before
making any change.** If something here conflicts with a one-off instruction from a human,
ask; don't silently pick one.

Project-wide docs live in `docs/`: `architecture.md`, `database.md`, `api.md`,
`business-rules.md`, `development.md`. This file is the entry point; those go deeper.

## 1. Project overview

**Financial Habit Builder & Wealth Growth Tracker** - a personal finance web app for
tracking income/expenses, financial habits with streaks, savings goals, and manually
entered assets/liabilities (net worth). It is an internship project built to a fixed
5-day plan. Optimize for correctness and a working, deployed product - not for breadth of
features or architectural sophistication.

**Explicitly out of scope. Do not add these under any justification:** bank/UPI
integration, automatic transaction sync, investment/stock trading, an AI financial
advisor, payment gateways, a mobile app, crypto trading, complex financial forecasting,
social/community features, real-time notification infrastructure, email automation. If a
task seems to require one of these, stop and flag it instead of implementing a workaround.

## 2. Technology stack

- **Frontend:** React 18 + Vite, plain JavaScript (not TypeScript), Tailwind CSS, React
  Router, TanStack Query, Axios, React Hook Form + Zod, Recharts, date-fns, lucide-react,
  react-hot-toast.
- **Backend:** Node.js, Express 5, plain JavaScript, JWT (`jsonwebtoken`), `bcryptjs`,
  Zod, Helmet, `cors`, `express-rate-limit`, `pg` (raw parameterized SQL - **no ORM**
  unless a genuine technical reason is documented in `docs/architecture.md` first).
- **Database:** PostgreSQL (13+).
- **Testing:** Vitest everywhere; Supertest for the API; React Testing Library for the
  client.
- **Deployment:** Vercel (frontend), Render or equivalent (backend), hosted PostgreSQL.

Do not introduce a new major library (a state manager, a UI kit, a CSS framework, an ORM,
a different HTTP client) without a clear reason recorded in `docs/architecture.md`.

## 3. Repository structure

```
client/src/  components/ (ui/, auth/, transactions/) · layouts/ · pages/ · hooks/ ·
             services/ · lib/ · schemas/ · utils/ · test/ · App.jsx · main.jsx
server/src/  config/ · middleware/ · routes/ · services/ · calc/ (pure functions) ·
             db/ (pool.js, migrate.js, seed.js, queries/) · utils/ · validators/ ·
             app.js · server.js
server/tests/ unit/ (no DB) · integration/ (needs TEST_DATABASE_URL) · helpers/
database/    migrations/ (NNN_description.sql, applied in order) · seeds/
docs/        architecture.md · database.md · api.md · business-rules.md · development.md
```

## 4. Architecture rules

- Layering is one-directional: **routes -> services -> db/queries -> database**. Pure
  calculation logic (net savings/savings rate now; streaks, goal progress, net worth
  later) lives in `server/src/calc/` with **no** Express or `pg` imports, so it can be
  unit-tested with plain function calls (see `server/tests/unit/summaryCalc.test.js`).
- Routes handle HTTP concerns and call `validate()` - they must not contain SQL or
  business rules.
- Services hold business rules and orchestrate `db/queries/*` calls; they throw
  `AppError` (see `server/src/utils/AppError.js`) for expected failure cases.
- `db/queries/*.js` holds all SQL for one table/entity. Every query function takes an
  optional `exec` parameter (defaults to the shared `query` from `db/pool.js`) so it can
  run inside `withTransaction`.
- The client's only global state is `AuthContext` (`hooks/useAuth.jsx`). Everything else
  is server state managed by TanStack Query, or local component state. Do not add Redux
  or a second global store.
- Keep the three-ledger model intact (see section 9 below and `docs/business-rules.md`
  section 1).

## 5. Database rules

- PostgreSQL only, accessed through `server/src/db/pool.js`'s `query()` /
  `withTransaction()`. **Never** call `pg` directly from a service or route.
- **Always** use parameterized queries (`$1, $2, ...`). Never interpolate user input into
  SQL text. A `sort` or `order by` column must come from a whitelist map, never from a raw
  request value.
- Money is `NUMERIC(14,2)` or `NUMERIC(16,2)`. **Never** use `FLOAT`/`REAL`/`DOUBLE
  PRECISION` for a monetary column.
- Dates are `DATE` (not `TIMESTAMPTZ`) for calendar-day fields such as
  `transaction_date`, `completion_date`, `contribution_date`. `pool.js` keeps `DATE`
  values as `'YYYY-MM-DD'` strings on purpose (see the type-parser comment there) - do not
  "fix" this by removing the parser, or streak/date logic will break across timezones.
- Schema changes go in a new numbered migration file (`database/migrations/NNN_*.sql`).
  **Never edit a migration that has already been applied** anywhere shared (ask a human
  if you're unsure); add a new migration instead. Run `npm run migrate` after adding one.
- Every user-owned table has a `user_id` foreign key with `ON DELETE CASCADE`. Every
  query against a user-owned table filters `WHERE user_id = $1`; a resource that exists
  but belongs to someone else returns `404`, not `403` (see `docs/api.md`).

## 6. Authentication rules

- Passwords are hashed with `bcryptjs` via `server/src/utils/password.js`
  (`hashPassword`/`verifyPassword`) - never store or compare plain text.
- JWTs are signed/verified only through `server/src/utils/token.js` (HS256, `sub` = user
  id). Do not add extra claims (role, email) to the token - **role and account status are
  always re-read from the database** on every request via `authenticate` middleware
  (`server/src/middleware/authenticate.js`), so a deactivation or role change takes effect
  immediately without waiting for token expiry.
- Login must not reveal whether an email exists: unknown email and wrong password return
  the same `401 INVALID_CREDENTIALS`, and a dummy bcrypt comparison (`getDummyHash()`)
  runs even when the email is unknown, to keep timing similar.

## 7. Authorization / RBAC rules

- Two roles: `user`, `admin`. Guard admin routes with
  `requireRole('admin')` (`server/src/middleware/authorize.js`), placed **after**
  `authenticate` in the middleware chain.
- **Never trust the frontend for authorization.** `ProtectedRoute`/`AdminRoute` in the
  client are UX conveniences only; the server is the only real gate.
- Admins can manage user accounts and see aggregate analytics; admins must **never** see
  another user's financial data (transactions, habits, goals, assets, liabilities).

## 8. Financial calculation rules

- All calculation rules, formulas and edge cases (zero income, future-dated
  transactions, missed habit days, goal overfunding, etc.) are defined in
  `docs/business-rules.md`. **Read it before touching any calculation.**
- Sums/aggregates are computed in SQL (`SUM`, `FILTER`, `generate_series`) over the real
  rows - never store a derived total as the source of truth (the one exception is
  `net_worth_snapshots`, which exists because there is no other way to chart net worth
  history; it is written by re-summing the live `assets`/`liabilities` tables, never
  computed independently).
- If you change a calculation's definition, update `docs/business-rules.md` and its
  test in `server/tests/unit/` (e.g. `summaryCalc.test.js` for anything in
  `calc/summary.js`) in the same change.
- This is a tracking app, not an advisor: never add recommendation text, "you should"
  copy, or projections. Descriptive labels only (e.g. "Budget used: 92%").

## 9. The three-ledger concept

Money is tracked in three independent ledgers that must never be mixed or
double-counted:

1. **Cash flow ledger** - `transactions` (income and expenses).
2. **Goals ledger** - `savings_goals` + `goal_contributions`.
3. **Balance sheet** - `assets` + `liabilities` (net worth).

A goal contribution is **not** automatically an expense. An asset is **not**
automatically income. Adding a transaction, a contribution, and an asset in the same
flow are three separate, independent writes - never derive one from another.

## 10. API conventions

Full detail in `docs/api.md`. Summary:

- Base path `/api`, JSON only. Success: `{ data }` (single) or `{ data: [...], meta }`
  (list). Errors: `{ error: { code, message, details? } }`.
- Standard codes: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`,
  `404 NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMITED`, `500 INTERNAL`.
- Money: JSON number, 2 decimals. Dates: `YYYY-MM-DD`. Months: `YYYY-MM`. Timestamps:
  ISO 8601. Keys: camelCase over the wire, snake_case in the database (`db/pool.js`
  converts automatically).
- New routes are registered in `server/src/routes/index.js`, grouped by resource, and
  documented in `docs/api.md` in the same change.

## 11. Frontend conventions

- API calls go through `services/*.js`, which use the shared Axios instance in
  `lib/axios.js`. Components never call `axios`/`fetch` directly.
- Server state (anything from the API) is fetched with TanStack Query; mutations
  `invalidateQueries` for every affected query key. Do not duplicate server data into
  local `useState`.
- New pages are added to `App.jsx`'s route tree and, if they need a real layout, wrapped
  in `AppLayout` inside the `ProtectedRoute` (and `AdminRoute` for admin-only pages).
- Reuse the primitives in `components/ui/` (`Button`, `Input`, `Card`, `Spinner`,
  `EmptyState`) instead of writing new ad hoc markup for the same purpose.
- A page for a feature that hasn't been built yet renders `ComingSoon`, not fake data.

## 12. Validation rules

- Every request body/query/params is validated server-side with Zod via the `validate()`
  middleware (`server/src/middleware/validate.js`) - this is the authoritative check.
  Client-side Zod schemas in `client/src/schemas/` mirror the server for instant feedback
  only; they are not a substitute for server validation.
- Body schemas use `.strict()` so unknown keys are rejected (blocks mass-assignment, e.g.
  a client sending `role: 'admin'`).
- See `docs/api.md` for the exact validation table (field limits, formats, ranges).

## 13. Security requirements

- Never commit secrets. Real values live in `.env` (git-ignored); `.env.example` documents
  every variable with a safe placeholder.
- Never hard-code credentials, tokens, or connection strings anywhere in source.
- Never bypass `authenticate`/`requireRole` "temporarily for testing" - remove any such
  bypass before finishing the task, and don't leave commented-out auth checks behind.
- Never trust `req.body`/`req.query`/`req.params` directly in a handler - always read
  from `req.valid` (populated by `validate()`).
- Never let a raw database or library error message reach the client - throw `AppError`
  or let it fall through to the central `errorHandler`, which already does this safely.

## 14. Naming conventions

- Files: `camelCase.js` for modules, `PascalCase.jsx` for React components.
- Database: `snake_case` tables/columns; API/JS: `camelCase` (converted automatically by
  `db/pool.js`'s `camelizeKeys`).
- Error codes: `SCREAMING_SNAKE_CASE`, stable, and documented in `docs/api.md` when added.
- Routes: plural resource nouns (`/api/transactions`, `/api/habits`), nested only when a
  child truly cannot exist without its parent (`/api/goals/:id/contributions`).

## 15-18. Testing, development, build, and migration/seed commands

Run from the repository root unless noted:

| Purpose | Command |
|---|---|
| Install everything | `npm run setup` |
| Run both dev servers | `npm run dev` |
| Run only backend / only frontend | `npm run dev:server` / `npm run dev:client` |
| Apply pending migrations | `npm run migrate` |
| Seed the admin account (+ seed files) | `npm run seed` |
| Run all tests (server + client) | `npm test` |
| Run only backend / only frontend tests | `npm run test:server` / `npm run test:client` |
| Build the frontend for production | `npm run build` |
| Preview the production build locally | `npm run preview` |
| Generate a random JWT secret | `npm run gen:secret` |

Full details, including how to point tests at a real database, are in
`docs/development.md`.

## 19. Environment variables

Documented with safe placeholders in the root `.env.example`. Copy it to `.env` and fill
in real values; never commit `.env`. Full description of every variable is in
`docs/development.md`.

## 20. Deployment architecture

Browser -> Vercel (static React build) -> HTTPS -> Render (Express API) -> hosted
PostgreSQL. See `docs/development.md` (Deployment section) for environment variables per
platform and the verification checklist. Do not restructure the app in a way that
requires a different deployment shape (e.g. server-side rendering, WebSockets as a hard
dependency) without discussing it first.

## 21. Scope boundaries

This is a 5-day plan. The day-by-day breakdown lives in `docs/development.md`. Unless a
human says otherwise, work on the current day's scope only - do not start a later day's
features early, and do not leave the current day's checkpoint unfinished to begin
something else.

## 22. Features that must NOT be added

Everything listed as out of scope in section 1, plus, without a scoped human request:
recurring/scheduled transactions, per-category budgets, transaction import/attachments,
soft deletes or audit logs, email verification/password reset/OAuth/2FA, weekly or
custom-frequency habits, goal withdrawals, live asset price feeds, dark mode, i18n, a
PWA/offline mode, GraphQL, microservices, Docker (not required for this deployment
shape), or any ORM.

## 23. Instructions for modifying existing code safely

1. **Inspect before you write.** Read the existing file(s) and the relevant `docs/*.md`
   section before creating something new. If a utility/component/service already does
   what you need, reuse or extend it - don't create a duplicate with a slightly different
   name.
2. **Don't rewrite working architecture unnecessarily.** A refactor needs a concrete
   reason (a real bug, a genuinely blocking limitation) - "I'd have designed it
   differently" is not sufficient.
3. **Don't introduce a new library** without checking section 2 and recording the
   reason in `docs/architecture.md` if you add one anyway.
4. **Schema changes always go through a new migration file** (section 5) - never hand-edit
   a database directly and never edit an already-applied migration.
5. Preserve existing user work. If Git is already initialized, run `git status`/`git
   diff` before making changes, and never delete work you didn't create without asking.

## 24. Instructions to avoid breaking existing functionality

- Keep the project runnable after every change - no broken imports, no dead/partial
  configuration left behind, no placeholder code that pretends to be a real
  implementation.
- Keep business logic out of routes and SQL out of services (section 4).
- If you change a shared function's signature or return shape, update every caller in
  the same change (grep for its usages first).

## 25-26. Run tests/lint/build before finishing work

Before declaring a task complete:

1. Run `npm run test:server` (and `npm run test:client` if you touched the frontend).
   Fix failures - do not report success with failing tests.
2. Run `npm run build` before declaring a frontend feature complete, and resolve any
   build errors.
3. Run `npm run migrate` if you added a migration, against a disposable/dev database.
4. Re-read the diff (`git diff`) for stray debug logging, commented-out code, or secrets.

## Rules for AI coding agents

- Read this file (`AGENTS.md`) before modifying the project.
- Inspect existing code before creating new files.
- Do not rewrite working architecture unnecessarily.
- Do not introduce new libraries without justification.
- Do not change the database schema without adding a migration.
- Never expose secrets.
- Never hard-code credentials.
- Never bypass authentication or authorization.
- Always validate user input on the server.
- Always enforce resource ownership on the server (`WHERE user_id = $1`, 404 on mismatch).
- Do not trust frontend authorization - it is UX only.
- Do not change financial calculation definitions without updating
  `docs/business-rules.md` and its tests in the same change.
- Run relevant tests after modifications.
- Run the production build (`npm run build`) before declaring a major feature complete.
- Keep changes focused on the task at hand.
- Do not implement out-of-scope features (section 1, section 22).
- Do not create duplicate utilities/components/services when an existing one can be
  reused.
