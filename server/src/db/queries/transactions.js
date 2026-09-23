import { query } from '../pool.js';

// Every function here takes userId and puts it in the WHERE clause of every statement -
// see AGENTS.md section 5 ("ownership enforced at the database-query level") and
// section 7. A transaction that exists but belongs to someone else is indistinguishable
// from one that doesn't exist: both resolve to `null`/rowCount 0, which services turn
// into 404 NOT_FOUND, never 403 - so an id doesn't reveal whether it belongs to someone.

const SELECT_WITH_CATEGORY = `
  SELECT t.id, t.user_id, t.category_id, t.type, t.amount, t.description,
         t.transaction_date, t.created_at, t.updated_at,
         c.name AS category_name, c.color AS category_color
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
`;

// Escapes ILIKE's wildcard characters in user-supplied search text so e.g. a literal "%"
// in a description can't be used to widen the match unexpectedly.
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Builds the shared `WHERE user_id = $1 AND ...` clause + its params for both the page
 * query and the totals query below, so the two can never drift out of sync with each
 * other (the totals must describe exactly the rows the page query would also match).
 */
function buildFilters(userId, { type, categoryId, startDate, endDate, search } = {}) {
  const params = [userId];
  const clauses = ['t.user_id = $1'];

  if (type) {
    params.push(type);
    clauses.push(`t.type = $${params.length}`);
  }
  if (categoryId) {
    params.push(categoryId);
    clauses.push(`t.category_id = $${params.length}`);
  }
  if (startDate) {
    params.push(startDate);
    clauses.push(`t.transaction_date >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    clauses.push(`t.transaction_date <= $${params.length}`);
  }
  if (search) {
    params.push(`%${escapeLike(search)}%`);
    clauses.push(`t.description ILIKE $${params.length} ESCAPE '\\'`);
  }

  return { whereSql: clauses.join(' AND '), params };
}

/**
 * Returns one page of transactions plus `totals` (income/expenses/count) computed over
 * the *entire* filtered set, not just the current page.
 */
export async function listTransactions(userId, filters, exec = query) {
  const { whereSql, params } = buildFilters(userId, filters);
  const { page, pageSize } = filters;
  const offset = (page - 1) * pageSize;

  const pageParams = [...params, pageSize, offset];
  const pageSql = `${SELECT_WITH_CATEGORY}
     WHERE ${whereSql}
     ORDER BY t.transaction_date DESC, t.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const totalsSql = `
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS income,
      COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS expenses
    FROM transactions t
    WHERE ${whereSql}`;

  const [{ rows }, { rows: totalsRows }] = await Promise.all([
    exec(pageSql, pageParams),
    exec(totalsSql, params),
  ]);

  const totals = totalsRows[0];
  return { rows, total: totals.total, totals: { income: totals.income, expenses: totals.expenses } };
}

export async function findTransactionById(userId, id, exec = query) {
  const { rows } = await exec(`${SELECT_WITH_CATEGORY} WHERE t.id = $1 AND t.user_id = $2`, [id, userId]);
  return rows[0] ?? null;
}

export async function insertTransaction(userId, { categoryId, type, amount, transactionDate, description }, exec = query) {
  const { rows } = await exec(
    `INSERT INTO transactions (user_id, category_id, type, amount, transaction_date, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, categoryId, type, amount, transactionDate, description ?? null],
  );
  return rows[0].id;
}

/** Returns the updated row's id, or null if it doesn't exist or belongs to another user. */
export async function updateTransactionById(
  userId,
  id,
  { categoryId, type, amount, transactionDate, description },
  exec = query,
) {
  const { rows } = await exec(
    `UPDATE transactions
     SET category_id = $1, type = $2, amount = $3, transaction_date = $4, description = $5, updated_at = now()
     WHERE id = $6 AND user_id = $7
     RETURNING id`,
    [categoryId, type, amount, transactionDate, description ?? null, id, userId],
  );
  return rows[0]?.id ?? null;
}

/** Returns true if a row belonging to this user was deleted. */
export async function deleteTransactionById(userId, id, exec = query) {
  const { rowCount } = await exec('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
  return rowCount > 0;
}

/** Income/expense totals + transaction count for one user within [startDate, endDate). */
export async function getMonthlyTotals(userId, startDate, endDate, exec = query) {
  const { rows } = await exec(
    `SELECT
       COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income,
       COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expenses,
       COUNT(*) AS transaction_count
     FROM transactions
     WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date < $3`,
    [userId, startDate, endDate],
  );
  return rows[0];
}

/** Per-category totals within [startDate, endDate), for the summary's category breakdown. */
export async function getMonthlyCategoryTotals(userId, startDate, endDate, exec = query) {
  const { rows } = await exec(
    `SELECT c.id AS category_id, c.name, c.color, t.type, SUM(t.amount) AS amount
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1 AND t.transaction_date >= $2 AND t.transaction_date < $3
     GROUP BY c.id, c.name, c.color, t.type
     ORDER BY amount DESC`,
    [userId, startDate, endDate],
  );
  return rows;
}
