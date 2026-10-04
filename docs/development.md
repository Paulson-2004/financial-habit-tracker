# Development guide

## Prerequisites

- Node.js 20+ (repo pins `.nvmrc` to 22; `engines.node >= 20` in both `package.json`s)
- npm 10+
- A PostgreSQL 13+ database - local, or a free hosted instance (Neon, Supabase, or
  Render's Postgres all work; connection string is all that's needed)
- Git

## First-time setup

```bash
git clone <repo-url>
cd financial-habit-tracker
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` - your PostgreSQL connection string.
- `JWT_SECRET` - run `npm run gen:secret` once dependencies are installed (see below) and
  paste the output in; or generate one now with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` - credentials for the admin account created
  by `npm run seed`. Choose your own; do not commit them.
- Leave `CLIENT_ORIGIN` as `http://localhost:5173` for local development.

Then:

```bash
npm run setup      # installs root, server, and client dependencies
npm run migrate    # creates the schema_migrations table and applies database/migrations/
npm run seed       # creates the admin account, and seeds system transaction categories
npm run dev        # runs the API (port 4000) and the client (port 5173) together
```

Open `http://localhost:5173`. Register a user, or log in with the seeded admin account
to see the Admin Panel nav link (visible to admins only). For visual reference across all
application views, see the [Screenshots Gallery](screenshots/README.md).

Run only one side with `npm run dev:server` or `npm run dev:client`.

## Environment variables

Full reference; see `.env.example` for the copy-pasteable version with placeholders.

| Variable | Used by | Notes |
|---|---|---|
| `NODE_ENV` | server | `development` \| `test` \| `production` |
| `PORT` | server | Render injects this in production; default `4000` locally |
| `DATABASE_URL` | server | PostgreSQL connection string |
| `DATABASE_SSL` | server | `true` for hosted databases that require TLS |
| `JWT_SECRET` | server | ≥32 chars; server refuses to start in production with the example placeholder |
| `JWT_EXPIRES_IN` | server | e.g. `8h`; format `\d+[smhd]` |
| `BCRYPT_COST` | server | 4-15; 12 is the default, drop to 10 if login feels slow on a small host |
| `CLIENT_ORIGIN` | server | comma-separated allowed CORS origin(s), no trailing slash |
| `SEED_ADMIN_NAME`/`EMAIL`/`PASSWORD` | `npm run seed` only | not read by the running server |
| `TEST_DATABASE_URL` | server tests | optional; enables the integration suite (see Testing) |
| `TEST_DATABASE_SSL` | server tests | optional, mirrors `DATABASE_SSL` for the test database |
| `VITE_API_URL` | client (build-time) | leave unset locally (Vite proxies `/api`); set to the deployed API URL in production and rebuild after changing it |

The client reads `VITE_API_URL` from the **repository-root** `.env` (see `envDir` in
`client/vite.config.js`) - there is deliberately no separate `client/.env`.

## Testing

**Backend unit tests** need no database and run by default:

```bash
npm run test:server
```

**Backend integration tests** (`server/tests/integration/`) exercise the real API against
a real database and are skipped automatically unless `TEST_DATABASE_URL` is set. Point it
at a **disposable database whose name contains "test"** - the suite truncates tables and
re-seeds system categories between test files (`server/tests/helpers/testDb.js`), and
refuses to run if the database name doesn't contain "test", as a safety check against
accidentally pointing at production data.

```bash
# .env
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/financial_tracker_test

npm run test:server
```

**Frontend tests:**

```bash
npm run test:client
```

**Everything:**

```bash
npm test
```

## Building for production

```bash
npm run build     # builds client/dist
npm run preview   # serves the production build locally for a smoke test
```

The backend needs no build step (plain Node.js); `npm start` runs it directly.

## Deployment

Browser -> Vercel (static build) -> Render (Express API) -> hosted PostgreSQL (Neon).

Live deployment URLs:
- **Frontend (Vercel):** https://fingrow-habit-tracker.vercel.app/
- **Backend API (Render):** https://financial-habit-tracker-4h06.onrender.com/
- **Repository:** https://github.com/Paulson-2004/financial-habit-tracker

### Database

Provision a PostgreSQL instance with your chosen provider and copy its connection
string. **If using Render's free PostgreSQL tier, note that it expires after a fixed
period** - for anything that needs to stay up for evaluation beyond that window, prefer a
provider without an expiry (confirm current terms with the provider, since free-tier
policies change).

### Backend (Render)

- Root directory: `server`
- Build command: `npm ci`
- Start command: `node src/db/migrate.js && node src/server.js` (runs pending migrations
  on every deploy, then starts the API)
- Health check path: `/api/health`
- Environment variables: `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL=true` (for
  most hosted providers), `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_COST`, `CLIENT_ORIGIN`
  (set once the Vercel URL is known - see order below)

Run `npm run seed` once, from your own machine, with `DATABASE_URL` pointed at the
production database, to create the admin account and seed the system transaction
categories (without this, the Transactions page has no categories to offer).

### Frontend (Vercel)

- Root directory: `client`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- `client/vercel.json` rewrites all paths to `index.html` so client-side routes
  (`/dashboard`, `/habits`, ...) don't 404 on a hard refresh.
- Environment variable: `VITE_API_URL=https://<your-api>.onrender.com/api` (redeploy
  after setting/changing it - it's baked in at build time)

### Deploy order

1. Database.
2. Backend, with a placeholder `CLIENT_ORIGIN` (e.g. `http://localhost:5173`) so it can
   start.
3. Frontend, with `VITE_API_URL` pointed at the backend's real URL.
4. Update the backend's `CLIENT_ORIGIN` to the real Vercel URL and redeploy.

### Deployment verification checklist

- `GET /api/health` returns `200` with `"database": "up"` on the live API.
- Registering a new user from the live frontend succeeds with no CORS errors in the
  browser console.
- Logging in with the seeded admin account works and `GET /api/admin/ping` returns `200`.
- The Admin Panel loads: overview totals, the user list, and feedback triage all render.
- A normal user visiting `/admin` is redirected, and `/api/admin/*` returns `403`.
- A hard refresh on a client-side route (e.g. `/dashboard`) does not 404.
- Render's free web services sleep after inactivity; the first request after a while can
  take up to about a minute to respond while the instance wakes up. This is expected, not
  a bug - later days add a "waking up..." message on the client for this.
