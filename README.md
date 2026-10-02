# FinGrow

**Build better habits. Grow your wealth.**

FinGrow (originally scoped as "Financial Habit Builder & Wealth Growth Tracker") is a
personal finance web app for tracking income and expenses, building financial habits
with streaks, working toward savings goals, and watching net worth grow from manually
entered assets and liabilities. Built as a 5-day internship project.

**This README distinguishes "Implemented" from "Planned" throughout. Nothing marked
Planned exists in the code yet.**

## Features

| Feature | Status |
|---|---|
| Registration & login (JWT) | **Implemented** |
| Session restore / "who am I" | **Implemented** |
| Role foundation (`user` / `admin`) + RBAC middleware | **Implemented** |
| Financial profile (currency, occupation, budget, savings target) | **Implemented** |
| Income & expense tracking, categorization, filtering, pagination | **Implemented** |
| Monthly summary (income, expenses, net savings, savings rate, category breakdown) | **Implemented** |
| Feedback / complaints (submit + view own) | **Implemented** (backend + tests; no UI yet - see below) |
| Financial habits with daily streaks & reminders | **Implemented** (daily streaks; reminders unscheduled - see below) |
| Savings goals & contributions | **Implemented** |
| Manual assets/investments, liabilities, net worth, wealth summary, snapshots | **Implemented** |
| Financial dashboard | **Implemented** |
| Admin panel (user management, analytics, feedback triage) | Planned - Day 5 |

The feedback API (submit + list own + retrieve one) is implemented and tested, but no
frontend page calls it yet - Day 2 explicitly scoped its frontend work to the
Transactions and Profile pages only. Habit reminders (from the original PRD) have no
scheduled day - habits only support daily frequency for now, with no reminder time or
notification of any kind.

### Explicitly out of scope

Bank/UPI integration, automatic transaction sync, investment/stock trading, an AI
financial advisor, payment gateways, a mobile app, crypto trading, complex financial
forecasting, social/community features, real-time notification infrastructure, email
automation. See `AGENTS.md` for the full boundary and why it's held firm.

## Technology stack

- **Frontend:** React 18, Vite, JavaScript, Tailwind CSS, React Router, TanStack Query,
  Axios, React Hook Form + Zod, Recharts, date-fns, lucide-react, react-hot-toast
- **Backend:** Node.js, Express 5, JavaScript, JWT, bcryptjs, Zod, Helmet, CORS,
  express-rate-limit, PostgreSQL via `pg` (raw parameterized SQL, no ORM)
- **Testing:** Vitest, Supertest, React Testing Library
- **Deployment:** Vercel (frontend), Render (backend), hosted PostgreSQL

## Architecture overview

```
Browser (React SPA)  --HTTPS/JSON-->  Express API  --parameterized SQL-->  PostgreSQL
```

Backend layering: `routes -> services -> db/queries -> database`, with pure calculation
logic isolated in `server/src/calc/` so it can be unit-tested without a database. Full
detail in `docs/architecture.md`.

## Repository structure

```
client/    React SPA (Vite)
server/    Express REST API
database/  SQL migrations and seed files
docs/      architecture.md, database.md, api.md, business-rules.md, development.md
AGENTS.md  Rules for AI coding agents working on this repo - read this first
```

## Prerequisites

Node.js 20+, npm 10+, a PostgreSQL 13+ database (local or hosted), Git.

## Installation

```bash
git clone <repo-url>
cd financial-habit-tracker
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, SEED_ADMIN_*
npm run setup
```

## Environment setup

All variables are documented with placeholders in `.env.example` and explained in full
in `docs/development.md`. The frontend reads `VITE_API_URL` from this same root `.env` -
there is no separate `client/.env` to keep in sync.

## Database setup

```bash
npm run migrate   # applies database/migrations/ in order (idempotent)
npm run seed      # creates the admin account, and seeds system transaction categories
```

## Development commands

```bash
npm run dev          # API on :4000 + client on :5173, together
npm run dev:server   # API only
npm run dev:client   # client only
```

## Testing commands

```bash
npm test             # server + client
npm run test:server  # backend unit tests (no DB needed); add TEST_DATABASE_URL to
                      # also run the integration suite - see docs/development.md
npm run test:client  # frontend tests
```

## Build commands

```bash
npm run build     # client/dist
npm run preview   # serve the production build locally
```

The API has no build step - `npm start` runs it directly with Node.

## Deployment overview

Vercel (frontend) + Render (backend) + hosted PostgreSQL. Full environment variables,
deploy order, and a post-deploy verification checklist are in `docs/development.md`.

## Security notes

- Passwords are hashed with bcrypt; plain text is never stored or logged.
- JWTs carry only a user id; role and active status are re-read from the database on
  every authenticated request, so a deactivation or role change takes effect
  immediately.
- All input is validated server-side with Zod (`.strict()` schemas reject unknown
  fields); client-side validation is a convenience, not the source of truth.
- All SQL is parameterized - no string-built queries.
- `.env` is git-ignored; `.env.example` holds only placeholders. Full list in
  `docs/development.md` and `AGENTS.md` section 13.

## Scope

See the Features table above and `AGENTS.md` sections 1 and 22 for the full in-scope /
out-of-scope boundary. The project intentionally avoids an ORM, microservices, and
enterprise-style abstraction layers that wouldn't pay for themselves at this size.

## Future improvements

Ideas beyond the 5-day PRD scope that were deliberately deferred, not because they're
unwise but because they're out of scope for this project: password reset/email
verification, refresh tokens, per-category budgets, recurring transactions, CSV export,
custom user-defined categories beyond the seeded set, habit reminders/notifications,
weekly or custom-frequency habits, withdrawing money from a goal (only adding and
removing individual contributions is supported), and investment gain/loss tracking (an
asset's `value` is just its current worth - there's no cost basis, purchase date, or
price history to compute a gain from). None of these should be added without a scoped
decision to do so - see `AGENTS.md`.
