import { query } from '../pool.js';

// Platform-level aggregate metrics for the admin overview. Every statement here
// counts rows across all users - no individual financial data (amounts, descriptions,
// habit names, goal targets) ever leaves these queries, only totals.
export async function getPlatformCounts(exec = query) {
  const { rows } = await exec(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS active_users,
      (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = TRUE) AS active_admins,
      (SELECT COUNT(*) FROM users WHERE created_at >= now() - INTERVAL '7 days') AS new_users_7d,
      (SELECT COUNT(*) FROM users WHERE created_at >= now() - INTERVAL '30 days') AS new_users_30d,
      (SELECT COUNT(*) FROM transactions) AS transactions,
      (SELECT COUNT(*) FROM habits) AS habits,
      (SELECT COUNT(*) FROM habit_completions) AS habit_completions,
      (SELECT COUNT(*) FROM savings_goals) AS savings_goals,
      (SELECT COUNT(*) FROM goal_contributions) AS goal_contributions,
      (SELECT COUNT(*) FROM assets) AS assets,
      (SELECT COUNT(*) FROM liabilities) AS liabilities,
      (SELECT COUNT(*) FROM feedback) AS feedback_total,
      (SELECT COUNT(*) FROM feedback WHERE status = 'open') AS feedback_open,
      (SELECT COUNT(*) FROM feedback WHERE status = 'in_review') AS feedback_in_review,
      (SELECT COUNT(*) FROM feedback WHERE status = 'resolved') AS feedback_resolved,
      (SELECT COUNT(*) FROM feedback WHERE type = 'complaint') AS complaints
  `);
  return rows[0];
}

// New users, transactions and feedback per calendar month for the last 6 months
// (including the current month), oldest first - feeds the admin trend chart.
// generate_series produces every month in the window so months with zero activity
// still appear, instead of vanishing from the chart.
export async function getMonthlyTrends(exec = query) {
  const { rows } = await exec(`
    WITH months AS (
      SELECT date_trunc('month', m)::date AS month
      FROM generate_series(
        date_trunc('month', now() - INTERVAL '5 months'),
        date_trunc('month', now()),
        INTERVAL '1 month'
      ) m
    )
    SELECT
      to_char(months.month, 'YYYY-MM') AS month,
      (SELECT COUNT(*) FROM users u
        WHERE date_trunc('month', u.created_at)::date = months.month) AS new_users,
      (SELECT COUNT(*) FROM transactions t
        WHERE date_trunc('month', t.created_at)::date = months.month) AS transactions,
      (SELECT COUNT(*) FROM feedback f
        WHERE date_trunc('month', f.created_at)::date = months.month) AS feedback
    FROM months
    ORDER BY months.month ASC
  `);
  return rows;
}

// Newest accounts first - safe metadata only (no financial data).
export async function getRecentUsers(limit = 5, exec = query) {
  const { rows } = await exec(
    `SELECT id, name, email, role, is_active, created_at
     FROM users ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

// Newest submissions with their author as safe metadata - no passwords or tokens.
export async function getRecentFeedback(limit = 5, exec = query) {
  const { rows } = await exec(
    `SELECT f.id, f.type, f.subject, f.status, f.created_at, u.name AS author_name, u.email AS author_email
     FROM feedback f JOIN users u ON u.id = f.user_id
     ORDER BY f.created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}
