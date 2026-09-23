import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

describe.skipIf(!hasTestDatabase)('transactions', () => {
  let app;
  let closePool;
  let incomeCategoryId;
  let expenseCategoryId;
  let token;

  beforeAll(async () => {
    ({ createApp: app } = await import('../../src/app.js'));
    ({ closePool } = await import('../../src/db/pool.js'));
  });
  afterAll(() => closePool());

  beforeEach(async () => {
    await resetTestDatabase();
    ({ token } = await registerUser(app()));

    const categoriesRes = await request(app()).get('/api/transactions/categories').set('Authorization', `Bearer ${token}`);
    incomeCategoryId = categoriesRes.body.data.find((c) => c.type === 'income').id;
    expenseCategoryId = categoriesRes.body.data.find((c) => c.type === 'expense').id;
  });

  function auth(req) {
    return req.set('Authorization', `Bearer ${token}`);
  }

  describe('GET /api/transactions/categories', () => {
    it('lists seeded system categories of both types', async () => {
      const res = await auth(request(app()).get('/api/transactions/categories'));
      expect(res.status).toBe(200);
      expect(res.body.data.some((c) => c.type === 'income')).toBe(true);
      expect(res.body.data.some((c) => c.type === 'expense')).toBe(true);
    });

    it('filters by type', async () => {
      const res = await auth(request(app()).get('/api/transactions/categories?type=income'));
      expect(res.status).toBe(200);
      expect(res.body.data.every((c) => c.type === 'income')).toBe(true);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).get('/api/transactions/categories');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/transactions', () => {
    it('creates an income transaction', async () => {
      const res = await auth(request(app()).post('/api/transactions')).send({
        type: 'income',
        categoryId: incomeCategoryId,
        amount: 50000,
        transactionDate: '2026-01-15',
        description: 'January salary',
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        type: 'income',
        amount: 50000,
        description: 'January salary',
        date: '2026-01-15',
      });
      expect(res.body.data.category.id).toBe(incomeCategoryId);
    });

    it('creates an expense transaction with no description', async () => {
      const res = await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 1200,
        transactionDate: '2026-01-16',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.description).toBeNull();
    });

    it('rejects a category/type mismatch', async () => {
      const res = await auth(request(app()).post('/api/transactions')).send({
        type: 'income',
        categoryId: expenseCategoryId, // an expense category used for an income transaction
        amount: 100,
        transactionDate: '2026-01-15',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.details.some((d) => d.field === 'categoryId')).toBe(true);
    });

    it('rejects a negative amount', async () => {
      const res = await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: -50,
        transactionDate: '2026-01-15',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a future-dated transaction beyond the one-day allowance', async () => {
      const res = await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 50,
        transactionDate: '2099-01-01',
      });
      expect(res.status).toBe(400);
    });

    it('rejects a nonexistent category id', async () => {
      const res = await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: '99999999-9999-4999-8999-999999999999',
        amount: 50,
        transactionDate: '2026-01-15',
      });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app())
        .post('/api/transactions')
        .send({ type: 'expense', categoryId: expenseCategoryId, amount: 50, transactionDate: '2026-01-15' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/transactions and /api/transactions/:id', () => {
    async function seedTransactions() {
      await auth(request(app()).post('/api/transactions')).send({
        type: 'income',
        categoryId: incomeCategoryId,
        amount: 50000,
        transactionDate: '2026-01-05',
        description: 'Salary',
      });
      await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 12000,
        transactionDate: '2026-01-10',
        description: 'Rent',
      });
      await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 300,
        transactionDate: '2026-02-01',
        description: 'Groceries',
      });
    }

    it('lists only the current user\'s transactions, newest first, with totals over the filtered set', async () => {
      await seedTransactions();
      const res = await auth(request(app()).get('/api/transactions'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].date).toBe('2026-02-01'); // newest first
      expect(res.body.totals).toMatchObject({ income: 50000, expenses: 12300, netSavings: 37700 });
      expect(res.body.meta.total).toBe(3);
    });

    it('filters by type', async () => {
      await seedTransactions();
      const res = await auth(request(app()).get('/api/transactions?type=income'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('income');
    });

    it('filters by category', async () => {
      await seedTransactions();
      const res = await auth(request(app()).get(`/api/transactions?categoryId=${incomeCategoryId}`));
      expect(res.body.data).toHaveLength(1);
    });

    it('filters by month', async () => {
      await seedTransactions();
      const res = await auth(request(app()).get('/api/transactions?month=2026-01'));
      expect(res.body.data).toHaveLength(2);
      expect(res.body.totals).toMatchObject({ income: 50000, expenses: 12000 });
    });

    it('filters by an explicit date range', async () => {
      await seedTransactions();
      const res = await auth(request(app()).get('/api/transactions?startDate=2026-01-06&endDate=2026-01-31'));
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Rent');
    });

    it('filters by description search', async () => {
      await seedTransactions();
      const res = await auth(request(app()).get('/api/transactions?search=rent'));
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].description).toBe('Rent');
    });

    it('paginates results', async () => {
      await seedTransactions();
      const res = await auth(request(app()).get('/api/transactions?page=1&pageSize=2'));
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    });

    it('retrieves a single transaction by id', async () => {
      const createRes = await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 42,
        transactionDate: '2026-01-15',
      });
      const res = await auth(request(app()).get(`/api/transactions/${createRes.body.data.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.amount).toBe(42);
    });

    it('returns 404 for a nonexistent transaction id', async () => {
      const res = await auth(request(app()).get('/api/transactions/99999999-9999-4999-8999-999999999999'));
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/transactions/:id and DELETE /api/transactions/:id', () => {
    it('updates a transaction', async () => {
      const createRes = await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 100,
        transactionDate: '2026-01-15',
        description: 'Original',
      });
      const res = await auth(request(app()).put(`/api/transactions/${createRes.body.data.id}`)).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 250,
        transactionDate: '2026-01-16',
        description: 'Updated',
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ amount: 250, description: 'Updated', date: '2026-01-16' });
    });

    it('deletes a transaction', async () => {
      const createRes = await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 100,
        transactionDate: '2026-01-15',
      });
      const deleteRes = await auth(request(app()).delete(`/api/transactions/${createRes.body.data.id}`));
      expect(deleteRes.status).toBe(204);

      const getRes = await auth(request(app()).get(`/api/transactions/${createRes.body.data.id}`));
      expect(getRes.status).toBe(404);
    });
  });

  describe('GET /api/transactions/summary', () => {
    it('computes income, expenses, net savings, savings rate, and category breakdown for a month', async () => {
      await auth(request(app()).post('/api/transactions')).send({
        type: 'income',
        categoryId: incomeCategoryId,
        amount: 50000,
        transactionDate: '2026-01-05',
      });
      await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 12000,
        transactionDate: '2026-01-10',
      });
      // Outside the requested month - must not be counted.
      await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 999,
        transactionDate: '2026-02-01',
      });

      const res = await auth(request(app()).get('/api/transactions/summary?month=2026-01'));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        month: '2026-01',
        income: 50000,
        expenses: 12000,
        netSavings: 38000,
        savingsRate: 76,
        transactionCount: 2,
      });
      expect(res.body.data.expensesByCategory[0]).toMatchObject({ categoryId: expenseCategoryId, amount: 12000, percent: 100 });
      expect(res.body.data.incomeByCategory[0]).toMatchObject({ categoryId: incomeCategoryId, amount: 50000, percent: 100 });
    });

    it('returns a null savings rate and zeros for a month with no transactions', async () => {
      const res = await auth(request(app()).get('/api/transactions/summary?month=2030-06'));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        income: 0,
        expenses: 0,
        netSavings: 0,
        savingsRate: null,
        transactionCount: 0,
        incomeByCategory: [],
        expensesByCategory: [],
      });
    });
  });

  describe('cross-user ownership protection', () => {
    it('User B cannot retrieve, update, or delete User A\'s transaction', async () => {
      const createRes = await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 100,
        transactionDate: '2026-01-15',
      });
      const transactionId = createRes.body.data.id;

      const userB = await registerUser(app());
      const asB = (req) => req.set('Authorization', `Bearer ${userB.token}`);

      const getRes = await asB(request(app()).get(`/api/transactions/${transactionId}`));
      expect(getRes.status).toBe(404);

      const putRes = await asB(request(app()).put(`/api/transactions/${transactionId}`)).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 1,
        transactionDate: '2026-01-15',
      });
      expect(putRes.status).toBe(404);

      const deleteRes = await asB(request(app()).delete(`/api/transactions/${transactionId}`));
      expect(deleteRes.status).toBe(404);

      // Prove it wasn't actually deleted or modified by User B's rejected attempts.
      const stillThereRes = await auth(request(app()).get(`/api/transactions/${transactionId}`));
      expect(stillThereRes.status).toBe(200);
      expect(stillThereRes.body.data.amount).toBe(100);
    });

    it('User B\'s transaction list never includes User A\'s transactions', async () => {
      await auth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: expenseCategoryId,
        amount: 100,
        transactionDate: '2026-01-15',
      });
      const userB = await registerUser(app());
      const res = await request(app()).get('/api/transactions').set('Authorization', `Bearer ${userB.token}`);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
