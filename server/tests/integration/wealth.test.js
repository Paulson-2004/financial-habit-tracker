import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

describe.skipIf(!hasTestDatabase)('wealth (net worth summary + snapshots)', () => {
  let app;
  let closePool;
  let token;

  beforeAll(async () => {
    ({ createApp: app } = await import('../../src/app.js'));
    ({ closePool } = await import('../../src/db/pool.js'));
  });
  afterAll(() => closePool());

  beforeEach(async () => {
    await resetTestDatabase();
    ({ token } = await registerUser(app()));
  });

  function auth(req) {
    return req.set('Authorization', `Bearer ${token}`);
  }

  async function addAsset(body) {
    const res = await auth(request(app()).post('/api/assets')).send(body);
    return res.body.data;
  }

  async function addLiability(body) {
    const res = await auth(request(app()).post('/api/liabilities')).send(body);
    return res.body.data;
  }

  describe('GET /api/wealth/summary', () => {
    it('returns zeros and empty arrays for a user with no assets or liabilities', async () => {
      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        totalAssets: 0,
        totalLiabilities: 0,
        netWorth: 0,
        assetAllocation: [],
        liabilityBreakdown: [],
        netWorthHistory: [],
        netWorthChange: { amount: null, percent: null },
      });
    });

    it('aggregates multiple assets and liabilities into correct totals and net worth', async () => {
      await addAsset({ name: 'Savings', category: 'bank_account', value: 5000 });
      await addAsset({ name: 'Shares A', category: 'stocks', value: 3000 });
      await addAsset({ name: 'Shares B', category: 'stocks', value: 2000 });
      await addLiability({ name: 'Card', category: 'credit_card', amount: 1000 });
      await addLiability({ name: 'Mortgage', category: 'home_loan', amount: 3000 });

      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data).toMatchObject({ totalAssets: 10000, totalLiabilities: 4000, netWorth: 6000 });
    });

    it('groups assets by category in the asset allocation, ranked by value', async () => {
      await addAsset({ name: 'Savings', category: 'bank_account', value: 2000 });
      await addAsset({ name: 'Shares A', category: 'stocks', value: 3000 });
      await addAsset({ name: 'Shares B', category: 'stocks', value: 2000 });

      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data.assetAllocation).toEqual([
        { category: 'stocks', amount: 5000, percent: 71.4 },
        { category: 'bank_account', amount: 2000, percent: 28.6 },
      ]);
    });

    it('groups liabilities by category in the liability breakdown', async () => {
      await addLiability({ name: 'Card', category: 'credit_card', amount: 1000 });
      await addLiability({ name: 'Mortgage', category: 'home_loan', amount: 9000 });

      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data.liabilityBreakdown).toEqual([
        { category: 'home_loan', amount: 9000, percent: 90 },
        { category: 'credit_card', amount: 1000, percent: 10 },
      ]);
    });

    it('reports a negative net worth when liabilities exceed assets', async () => {
      await addAsset({ name: 'Savings', value: 1000 });
      await addLiability({ name: 'Big loan', amount: 5000 });

      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data.netWorth).toBe(-4000);
    });

    it('reflects an asset update and delete immediately (nothing cached)', async () => {
      const asset = await addAsset({ name: 'Savings', value: 1000 });
      await auth(request(app()).patch(`/api/assets/${asset.id}`)).send({ value: 4000 });
      let res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data.totalAssets).toBe(4000);

      await auth(request(app()).delete(`/api/assets/${asset.id}`));
      res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data.totalAssets).toBe(0);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).get('/api/wealth/summary');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/wealth/snapshots', () => {
    it('records a snapshot with totals computed server-side from current assets and liabilities', async () => {
      await addAsset({ name: 'Savings', value: 10000 });
      await addLiability({ name: 'Loan', amount: 4000 });

      const res = await auth(request(app()).post('/api/wealth/snapshots'));
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ totalAssets: 10000, totalLiabilities: 4000, netWorth: 6000 });
      expect(res.body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('ignores any client-supplied totals or date (nothing to spoof)', async () => {
      await addAsset({ name: 'Savings', value: 1000 });
      const res = await auth(request(app()).post('/api/wealth/snapshots')).send({
        totalAssets: 999999,
        totalLiabilities: 0,
        date: '2000-01-01',
        userId: 'someone-else',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.totalAssets).toBe(1000);
      expect(res.body.data.date).not.toBe('2000-01-01');
    });

    it('a second snapshot on the same day updates the existing one instead of duplicating or erroring', async () => {
      await addAsset({ name: 'Savings', value: 1000 });
      const first = await auth(request(app()).post('/api/wealth/snapshots'));
      expect(first.status).toBe(201);

      await addAsset({ name: 'More savings', value: 500 });
      const second = await auth(request(app()).post('/api/wealth/snapshots'));
      expect(second.status).toBe(201);
      expect(second.body.data.id).toBe(first.body.data.id); // same row, updated
      expect(second.body.data.totalAssets).toBe(1500);

      const summary = await auth(request(app()).get('/api/wealth/summary'));
      expect(summary.body.data.netWorthHistory).toHaveLength(1);
    });

    it('records a snapshot even with no assets or liabilities (net worth 0)', async () => {
      const res = await auth(request(app()).post('/api/wealth/snapshots'));
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
    });

    it('shows recorded snapshots in the summary\'s netWorthHistory', async () => {
      await addAsset({ name: 'Savings', value: 1000 });
      await auth(request(app()).post('/api/wealth/snapshots'));
      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data.netWorthHistory).toHaveLength(1);
      expect(res.body.data.netWorthHistory[0]).toMatchObject({ totalAssets: 1000, netWorth: 1000 });
    });

    it('reports net worth change against the most recent snapshot', async () => {
      await addAsset({ name: 'Savings', value: 5000 });
      await auth(request(app()).post('/api/wealth/snapshots'));

      // Add more after the snapshot - live net worth is now 6000, snapshot said 5000.
      await addAsset({ name: 'Bonus', value: 1000 });
      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data.netWorth).toBe(6000);
      expect(res.body.data.netWorthChange).toEqual({ amount: 1000, percent: 20 });
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).post('/api/wealth/snapshots');
      expect(res.status).toBe(401);
    });
  });

  describe('cross-user ownership protection', () => {
    it('User B\'s summary and snapshots never include User A\'s assets or liabilities', async () => {
      await addAsset({ name: 'Savings', value: 10000 });
      await addLiability({ name: 'Loan', amount: 2000 });
      await auth(request(app()).post('/api/wealth/snapshots'));

      const userB = await registerUser(app());
      const asB = (req) => req.set('Authorization', `Bearer ${userB.token}`);

      const summaryRes = await asB(request(app()).get('/api/wealth/summary'));
      expect(summaryRes.body.data).toMatchObject({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
      expect(summaryRes.body.data.netWorthHistory).toEqual([]);

      // User B recording a snapshot only reflects User B's own (empty) balance sheet.
      const snapshotRes = await asB(request(app()).post('/api/wealth/snapshots'));
      expect(snapshotRes.body.data).toMatchObject({ totalAssets: 0, totalLiabilities: 0 });

      // ...and did not touch User A's snapshot history.
      const aSummaryRes = await auth(request(app()).get('/api/wealth/summary'));
      expect(aSummaryRes.body.data.netWorthHistory).toHaveLength(1);
      expect(aSummaryRes.body.data.netWorthHistory[0].totalAssets).toBe(10000);
    });
  });

  describe('three-ledger independence (cash flow / goals / balance sheet)', () => {
    it('transactions and goal contributions never affect net worth', async () => {
      // Cash flow ledger: income and expense transactions.
      const categoriesRes = await auth(request(app()).get('/api/transactions/categories'));
      const incomeCategoryId = categoriesRes.body.data.find((c) => c.type === 'income').id;
      const expenseCategoryId = categoriesRes.body.data.find((c) => c.type === 'expense').id;
      await auth(request(app()).post('/api/transactions')).send({
        type: 'income',
        categoryId: incomeCategoryId,
        amount: 50000,
        transactionDate: '2026-01-15',
      });
      await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 12000,
        transactionDate: '2026-01-16',
      });

      // Goals ledger: a goal with a contribution.
      const goalRes = await auth(request(app()).post('/api/goals')).send({ name: 'Emergency fund', targetAmount: 100000 });
      await auth(request(app()).post(`/api/goals/${goalRes.body.data.id}/contributions`)).send({
        amount: 20000,
        contributionDate: '2026-01-17',
      });

      // Balance sheet: nothing recorded - so net worth must still be exactly 0.
      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data).toMatchObject({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 });
    });

    it('only explicitly recorded assets/liabilities move net worth, regardless of other ledgers', async () => {
      const goalRes = await auth(request(app()).post('/api/goals')).send({ name: 'Emergency fund', targetAmount: 100000 });
      await auth(request(app()).post(`/api/goals/${goalRes.body.data.id}/contributions`)).send({
        amount: 20000,
        contributionDate: '2026-01-17',
      });
      // The user chooses to also record the resulting money as an asset - only THIS counts.
      await addAsset({ name: 'Emergency fund savings', category: 'bank_account', value: 20000 });

      const res = await auth(request(app()).get('/api/wealth/summary'));
      expect(res.body.data.netWorth).toBe(20000); // 20000, not 40000 - no double counting
    });
  });
});
