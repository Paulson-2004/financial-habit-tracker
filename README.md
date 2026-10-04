# FinGrow

> **Build better habits. Grow your wealth.**

FinGrow is a personal finance, habit-building, and wealth-growth web application. It combines cash flow tracking, financial habits with streak mechanics, dedicated savings goals, and balance-sheet net worth management into a single, cohesive dashboard.

[![Live Demo](https://img.shields.io/badge/Demo-Live%20App-emerald?style=flat-square&logo=vercel)](https://fingrow-habit-tracker.vercel.app/)
[![API Status](https://img.shields.io/badge/API-Render%20Live-blue?style=flat-square&logo=render)](https://financial-habit-tracker-4h06.onrender.com/)
[![GitHub](https://img.shields.io/badge/Source-GitHub-darkviolet?style=flat-square&logo=github)](https://github.com/Paulson-2004/financial-habit-tracker)
[![Tests Passing](https://img.shields.io/badge/Tests-474%2F474%20Passing-success?style=flat-square&logo=vitest)](docs/testing.md)

---

## Live Demo

* 🌐 **Frontend Application:** [https://fingrow-habit-tracker.vercel.app/](https://fingrow-habit-tracker.vercel.app/)
* ⚡ **Backend API Service:** [https://financial-habit-tracker-4h06.onrender.com/](https://financial-habit-tracker-4h06.onrender.com/)
* 📦 **GitHub Repository:** [https://github.com/Paulson-2004/financial-habit-tracker](https://github.com/Paulson-2004/financial-habit-tracker)

---

## Overview

Most personal finance apps either focus exclusively on logging expense receipts or present passive balance views without reinforcing positive financial behavior.

FinGrow connects day-to-day money discipline with long-term wealth accumulation. Users form positive financial habits—such as reviewing daily spending, avoiding impulsive buys, or transferring scheduled savings—while directly tracking their income, expenses, dedicated savings targets, and net worth growth.

---

## Features

* **Authentication & Security:** Stateless JWT authentication (HS256), bcrypt password hashing with timing-attack mitigation, server-side RBAC (`user` and `admin`), strict Zod validation, and cross-user ownership isolation.
* **Financial Tracking:** Log income and expense transactions across 18 categorized buckets with dynamic monthly summaries, net savings, and savings rate analytics.
* **Habits & Reminders:** Daily, weekly, and monthly financial habits with period-aware completion tracking, consecutive streaks, and in-app reminder schedules.
* **Savings Goals:** Earmarked targets with customizable target amounts, target dates, incremental contribution logging, and visual progress tracking.
* **Wealth Tracking:** Balance sheet registers for assets and liabilities with live Net Worth calculation ($\text{Net Worth} = \text{Assets} - \text{Liabilities}$) and historical snapshot charts.
* **Dashboard & Analytics:** Centralized financial overview featuring interactive category donut charts, net worth trend lines, habit streak cards, and recent activity.
* **Feedback & Support:** Submit feedback or complaints and track ticket resolution status.
* **Admin Operations Panel:** Platform-wide analytics, user account activation/deactivation, and feedback triage for administrator accounts.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, JavaScript, Tailwind CSS, TanStack Query, React Router, Recharts, Lucide React |
| **Backend** | Node.js, Express 5, Zod, JWT (`jsonwebtoken`), `bcryptjs`, Helmet, CORS, `express-rate-limit` |
| **Database** | PostgreSQL 13+, `pg` (raw parameterized SQL, no ORM), Neon Lakebase |
| **Testing** | Vitest, Supertest, React Testing Library (474 tests) |
| **Deployment** | Vercel (Frontend SPA), Render (Express API), Neon (Hosted PostgreSQL) |

---

## Architecture

FinGrow follows a strictly layered, decoupled architecture with raw parameterized SQL and pure calculation functions:

```
React 18 SPA (Vercel)
       ↓ HTTPS / JSON + Bearer JWT
Express 5 REST API (Render)
       ↓ validate() → Services → Pure Calculations (/calc)
PostgreSQL 13+ (Neon Database)
```

Business logic and financial calculations are isolated in `server/src/calc/` as pure functions with zero database or framework dependencies, enabling deterministic unit testing. See the [Architecture Guide](docs/architecture.md) for details on the three-ledger model and security controls.

---

## Application Screens

* **Dashboard (`/dashboard`):** Central financial summary, spending charts, net worth trends, and habit status.
* **Transactions (`/transactions`):** Income/expense ledger with category breakdowns, month filters, and pagination.
* **Habits (`/habits`):** Habit checklist with frequency indicators, streak counters, and reminder alerts.
* **Goals (`/goals`):** Savings targets with contribution forms and percentage progress bars.
* **Wealth (`/wealth`):** Assets, liabilities, live net worth calculation, and snapshot history.
* **Profile (`/profile`):** Currency preferences, occupation, and monthly budget targets.
* **Feedback (`/feedback`):** Form for reporting issues or feedback with ticket audit history.
* **Admin Panel (`/admin`):** Administrator dashboard for platform health, user management, and feedback triage.

---

## Testing

FinGrow features automated test coverage across both server and client:

* **Server Tests:** 386 / 386 passed (29 test files)
* **Client Tests:** 88 / 88 passed (18 test files)
* **Total Suite:** 474 / 474 passed (0 failures, 0 skipped)
* **Production Build:** Verified Vite build with zero errors.

Run all tests with `npm test`. See the [Testing Guide](docs/testing.md) for the complete breakdown.

---

## Local Development

### Prerequisites
Node.js 20+, npm 10+, PostgreSQL 13+, Git.

### Setup Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Paulson-2004/financial-habit-tracker.git
   cd financial-habit-tracker
   ```
2. **Install dependencies:**
   ```bash
   npm run setup
   ```
3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Fill in DATABASE_URL, JWT_SECRET, and SEED_ADMIN_* in .env
   ```
4. **Apply migrations and seed data:**
   ```bash
   npm run migrate
   npm run seed
   ```
5. **Start development servers:**
   ```bash
   npm run dev
   ```
   *API runs on `http://localhost:4000`, client on `http://localhost:5173`.*

---

## Documentation

Detailed technical references are maintained in [`docs/`](docs/):

| Document | Description |
|---|---|
| [API Reference](docs/api.md) | REST API endpoints, schemas, payloads, and HTTP response codes |
| [Architecture](docs/architecture.md) | System design, three-ledger model, security controls, and layering |
| [Database Guide](docs/database.md) | PostgreSQL schema, tables, relationships, constraints, and migrations |
| [Business Rules](docs/business-rules.md) | Financial calculation formulas, streaks, goal progress, and reminder logic |
| [Development Guide](docs/development.md) | Environment configuration, local workflow, and deployment runbook |
| [Testing Guide](docs/testing.md) | Unit, integration, component test suites, and verified test metrics |

---

## Deployment

FinGrow is configured for cloud deployment across three independent services:
* **Frontend:** Deployed to **Vercel** as a static SPA (`client/dist`).
* **Backend:** Deployed to **Render** as a Node.js web service.
* **Database:** Hosted on **Neon** serverless PostgreSQL.

Full deployment setup, environment variables, and verification steps are documented in the [Development Guide](docs/development.md).

---

## Scope & Intentional Boundaries

FinGrow emphasizes data integrity, clean architecture, and habit psychology. Certain features are intentionally out of scope:
* **Manual Entry:** Transactions and assets are entered manually; no automated bank or UPI synchronization.
* **In-App Reminders:** Reminders display via in-app alert banners; no external SMS, email, or push notifications.
* **No Trading Feeds:** Valuations are point-in-time entries; not a live brokerage or stock trading tool.
* **Descriptive Analytics:** Provides objective summaries and ratios without automated financial advisory or forecasting.

---

## Future Enhancements

* Automated bank statement import (CSV / OFX).
* Recurring transactions and subscription trackers.
* Web push notifications for habit reminders.
* Target completion date estimations based on contribution velocity.
* Data export in CSV / JSON formats.

---

## License

This project was developed as a proprietary software project. All rights reserved.
