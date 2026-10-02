import * as assetsDb from '../db/queries/assets.js';
import * as liabilitiesDb from '../db/queries/liabilities.js';
import * as snapshotsDb from '../db/queries/netWorthSnapshots.js';
import {
  calculateNetWorth,
  calculateNetWorthChange,
  calculateTotalAssets,
  calculateTotalLiabilities,
  computeAssetAllocation,
  computeLiabilityBreakdown,
} from '../calc/netWorth.js';
import { todayUTC } from '../utils/dates.js';
import { MAX_SNAPSHOT_HISTORY } from '../validators/wealthValidators.js';

function toPublicSnapshot(row) {
  return {
    id: row.id,
    date: row.snapshotDate,
    totalAssets: row.totalAssets,
    totalLiabilities: row.totalLiabilities,
    netWorth: row.netWorth,
  };
}

/**
 * Fetches this user's current asset/liability rows once and derives everything else
 * (totals, allocation, breakdown) from that same in-memory list via calc/netWorth.js -
 * see AGENTS.md section 4 ("do not duplicate calculation logic"). The row count for a
 * personal net-worth tracker is small enough that summing in JS (rather than a second
 * SQL SUM query) is both simple and exact.
 */
async function getCurrentTotals(userId) {
  const [assets, liabilities] = await Promise.all([
    assetsDb.listAssets(userId),
    liabilitiesDb.listLiabilities(userId),
  ]);
  return {
    assets,
    liabilities,
    totalAssets: calculateTotalAssets(assets),
    totalLiabilities: calculateTotalLiabilities(liabilities),
  };
}

export async function getSummary(userId) {
  const [{ assets, liabilities, totalAssets, totalLiabilities }, history, mostRecentSnapshot] = await Promise.all([
    getCurrentTotals(userId),
    snapshotsDb.listSnapshots(userId, MAX_SNAPSHOT_HISTORY),
    snapshotsDb.findMostRecentSnapshot(userId),
  ]);

  const netWorth = calculateNetWorth(totalAssets, totalLiabilities);

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    assetAllocation: computeAssetAllocation(assets),
    liabilityBreakdown: computeLiabilityBreakdown(liabilities),
    netWorthHistory: history.map(toPublicSnapshot),
    // Compared against the most recent snapshot, if any - see docs/business-rules.md.
    netWorthChange: calculateNetWorthChange(netWorth, mostRecentSnapshot ? mostRecentSnapshot.netWorth : null),
  };
}

/**
 * Records today's snapshot from the user's CURRENT assets/liabilities - never from
 * transactions, never backdated (see database/migrations/004_*.sql). User-triggered only
 * - there is no scheduler (see AGENTS.md section 22).
 */
export async function recordSnapshot(userId) {
  const { totalAssets, totalLiabilities } = await getCurrentTotals(userId);
  const row = await snapshotsDb.upsertSnapshot(userId, todayUTC(), totalAssets, totalLiabilities);
  return toPublicSnapshot(row);
}
