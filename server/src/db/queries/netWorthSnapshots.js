import { query } from '../pool.js';

const COLUMNS = 'id, user_id, snapshot_date, total_assets, total_liabilities, net_worth, created_at, updated_at';

/**
 * Records (or refreshes) one user's snapshot for `snapshotDate`. A second call for the
 * same user+date UPSERTS fresh totals into the existing row rather than erroring or
 * creating a duplicate - see the migration's header comment for why.
 */
export async function upsertSnapshot(userId, snapshotDate, totalAssets, totalLiabilities, exec = query) {
  const { rows } = await exec(
    `INSERT INTO net_worth_snapshots (user_id, snapshot_date, total_assets, total_liabilities)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, snapshot_date)
     DO UPDATE SET total_assets = EXCLUDED.total_assets,
                   total_liabilities = EXCLUDED.total_liabilities,
                   updated_at = now()
     RETURNING ${COLUMNS}`,
    [userId, snapshotDate, totalAssets, totalLiabilities],
  );
  return rows[0];
}

/** Up to `limit` most recent snapshots, returned oldest-first (for a left-to-right chart). */
export async function listSnapshots(userId, limit, exec = query) {
  const { rows } = await exec(
    `SELECT ${COLUMNS} FROM net_worth_snapshots WHERE user_id = $1 ORDER BY snapshot_date DESC LIMIT $2`,
    [userId, limit],
  );
  return rows.reverse();
}

export async function findMostRecentSnapshot(userId, exec = query) {
  const { rows } = await exec(
    `SELECT ${COLUMNS} FROM net_worth_snapshots WHERE user_id = $1 ORDER BY snapshot_date DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}
