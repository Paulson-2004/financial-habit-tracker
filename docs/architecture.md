# Architecture

See `AGENTS.md` for the rules an AI agent must follow. This document explains the
reasoning behind them.

## Status

This describes the target architecture for the whole project. Sections marked
**(Day 1)** were implemented Day 1, and so on for Day 2/Day 3 - everything through Day 3
is implemented now; the rest is the plan for Day 4-5 (see `development.md`). Nothing
described as implemented here is a placeholder.

## Overview

A single-page React app talks to a REST API over JSON. The API is a single Express
process backed by one PostgreSQL database. There is no queue, cache, or second service -
deliberately, for a 5-day project at this scale.

```
Browser (React SPA, Vercel)
   |  HTTPS, JSON, Authorization: Bearer <JWT>
   v
Express API (Render)
   |  parameterized SQL via pg
   v
PostgreSQL (hosted)
```

## Backend layering **(Day 1, extended Day 2-3)**

```
routes -> services -> db/queries -> database
             \-> calc (pure functions)
```

- **`routes/`**: HTTP only. Parses nothing itself - `validate()` middleware does that.
  Calls exactly one service function per handler and shapes the response envelope.
- **`services/`**: business rules and orchestration. Throws `AppError` for expected
  failures (duplicate email, disabled account, not-yours resource, etc). Uses
  `withTransaction` when a request needs more than one write to succeed or fail together.
- **`db/queries/<entity>.js`**: all SQL for one entity. Every exported function accepts an
  optional `exec` argument (default: the shared `query`) so services can pass a
  transaction client through.
- **`calc/`**: pure functions with no `pg`/Express imports - net savings/savings rate
  (Day 2), habit streaks and goal progress (Day 3), net worth (Day 4). Unit-tested
  directly with plain inputs/outputs.

This is intentionally three logical layers, not more. There is no repository-pattern
abstraction on top of `db/queries`, no dependency-injection container, and no service
interfaces - they would add indirection without a corresponding benefit at this size.

## Frontend layering **(Day 1)**

- **`services/`**: one file per API resource, using the shared Axios instance
  (`lib/axios.js`). Components never import `axios` directly.
- **Server state**: TanStack Query owns everything that comes from the API - caching,
  loading/error state, and cache invalidation after mutations. There is no Redux/Zustand
  store; server state lives in the Query cache, not in component state.
- **Auth state**: the one exception, in `hooks/useAuth.jsx` (`AuthContext`). It holds the
  current user and exposes `login`/`register`/`logout`. On mount it validates any stored
  token against `GET /api/auth/me` rather than trusting `localStorage` blindly.
- **`components/ui/`**: small, shared Tailwind primitives (`Button`, `Input`, `Card`,
  `Spinner`, `EmptyState`, `ComingSoon`, `Modal`, `ProgressBar`). Feature-specific
  components live in their own folder (`components/transactions/`, `components/habits/`,
  `components/goals/`) rather than inside `pages/`, once a page needs more than the page
  component itself (e.g. a form used by both a create and an edit flow).
- **Routing**: `App.jsx` is the single route tree. `ProtectedRoute` gates anything
  requiring login; `AdminRoute` (nested inside it) additionally gates `/admin`. Both are
  UX conveniences - the API is the real authorization boundary.

## API conventions

See `api.md` for the full endpoint list and per-route validation. The conventions
(response envelope, error codes, camelCase over the wire) are fixed from Day 1 onward so
every later endpoint is consistent without re-deciding the shape each time.

## Authentication & authorization architecture **(Day 1 foundation)**

- Stateless JWT (HS256), `sub` claim only. No refresh tokens, no session store - kept
  deliberately simple; see `AGENTS.md` section 6 for why role/status are re-read from the
  database on every request instead of trusted from the token.
- Two roles (`user`, `admin`) as a single column, not a permissions table. A future
  requirement for finer-grained permissions would justify revisiting this, but the PRD
  only calls for these two roles.
- Route guards compose as `router.use(authenticate, requireRole('admin'))` -
  authentication and authorization are separate middleware so a route can require login
  without requiring a specific role.

## Error-handling strategy **(Day 1)**

One central `errorHandler` (`server/src/middleware/errorHandler.js`) formats every error
into `{ error: { code, message, details? } }`. Services/middleware throw `AppError` for
expected conditions; anything else (a bug, an unexpected DB error) is logged server-side
and returns a generic `500 INTERNAL` - the client never sees a raw stack trace or
database error text. See `api.md` for the standard error codes.

## Validation strategy **(Day 1)**

Zod schemas, run through one `validate()` middleware, are the single source of truth for
"is this request well-formed." Client-side schemas in `client/src/schemas/` duplicate the
simple rules for instant feedback but are never trusted on their own - every route
re-validates server-side. Body schemas use `.strict()` to reject unknown fields, which
closes the mass-assignment hole (e.g. a client trying to send `role: 'admin'` at
registration).

## Why no ORM

Raw parameterized SQL via `pg` was chosen over an ORM (Prisma/Sequelize/TypeORM) because:

1. The queries this project needs are simple CRUD plus a handful of aggregate
   (`SUM`/`FILTER`/`generate_series`) queries - exactly what SQL is good at, and exactly
   the kind of query that's often awkward to express through an ORM's query builder.
2. One less dependency and code-generation step to set up within a 5-day timeline.
3. Being comfortable reading and writing raw SQL is itself a demonstrable skill for the
   resume value described in the architecture plan.

If a genuine need arises later (e.g. complex migrations across many environments), that
tradeoff should be revisited explicitly and recorded here - not silently reversed.

## Deployment architecture

See `development.md` for the full deployment plan, environment variables, and
verification checklist.
