import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

describe.skipIf(!hasTestDatabase)('savings goals', () => {
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

  async function createGoal(body = { name: 'Emergency fund', targetAmount: 100000 }) {
    const res = await auth(request(app()).post('/api/goals')).send(body);
    return res.body.data;
  }

  describe('POST /api/goals', () => {
    it('creates a goal with zero progress', async () => {
      const res = await auth(request(app()).post('/api/goals')).send({ name: 'Emergency fund', targetAmount: 100000 });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Emergency fund',
        targetAmount: 100000,
        contributedAmount: 0,
        remainingAmount: 100000,
        progressPercent: 0,
        status: 'in_progress',
      });
    });

    it('accepts an optional future target date and description', async () => {
      const res = await auth(request(app()).post('/api/goals')).send({
        name: 'New laptop',
        targetAmount: 80000,
        targetDate: '2099-01-01',
        description: 'For work',
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ targetDate: '2099-01-01', description: 'For work' });
    });

    it('rejects a zero or negative target amount', async () => {
      expect((await auth(request(app()).post('/api/goals')).send({ name: 'Fund', targetAmount: 0 })).status).toBe(400);
      expect((await auth(request(app()).post('/api/goals')).send({ name: 'Fund', targetAmount: -1 })).status).toBe(400);
    });

    it('rejects a target date in the past', async () => {
      const res = await auth(request(app()).post('/api/goals')).send({
        name: 'Fund',
        targetAmount: 100,
        targetDate: '2000-01-01',
      });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).post('/api/goals').send({ name: 'Fund', targetAmount: 100 });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/goals and /api/goals/:id', () => {
    it('lists the user\'s goals', async () => {
      await createGoal({ name: 'Fund A', targetAmount: 1000 });
      await createGoal({ name: 'Fund B', targetAmount: 2000 });
      const res = await auth(request(app()).get('/api/goals'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('retrieves a single goal by id', async () => {
      const goal = await createGoal();
      const res = await auth(request(app()).get(`/api/goals/${goal.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(goal.id);
    });

    it('returns 404 for a nonexistent goal id', async () => {
      const res = await auth(request(app()).get('/api/goals/99999999-9999-4999-8999-999999999999'));
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/goals/:id and DELETE /api/goals/:id', () => {
    it('updates a goal', async () => {
      const goal = await createGoal({ name: 'Original', targetAmount: 1000 });
      const res = await auth(request(app()).put(`/api/goals/${goal.id}`)).send({ name: 'Updated', targetAmount: 5000 });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'Updated', targetAmount: 5000 });
    });

    it('allows updating a goal to keep a target date that is already in the past', async () => {
      // Create with no date, then edit in an overdue date directly - this exercises the
      // create/update validation difference (see validators/goalValidators.js).
      const goal = await createGoal({ name: 'Fund', targetAmount: 1000 });
      const res = await auth(request(app()).put(`/api/goals/${goal.id}`)).send({
        name: 'Fund',
        targetAmount: 1000,
        targetDate: '2020-01-01',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('overdue');
    });

    it('returns 404 updating a nonexistent goal', async () => {
      const res = await auth(request(app()).put('/api/goals/99999999-9999-4999-8999-999999999999')).send({
        name: 'Fund',
        targetAmount: 100,
      });
      expect(res.status).toBe(404);
    });

    it('deletes a goal', async () => {
      const goal = await createGoal();
      const deleteRes = await auth(request(app()).delete(`/api/goals/${goal.id}`));
      expect(deleteRes.status).toBe(204);
      const getRes = await auth(request(app()).get(`/api/goals/${goal.id}`));
      expect(getRes.status).toBe(404);
    });
  });

  describe('contributions', () => {
    it('spec example: contributions 20000 + 30000 toward a 100000 target -> 50% progress', async () => {
      const goal = await createGoal({ name: 'Fund', targetAmount: 100000 });
      await auth(request(app()).post(`/api/goals/${goal.id}/contributions`)).send({
        amount: 20000,
        contributionDate: '2026-01-01',
      });
      const res = await auth(request(app()).post(`/api/goals/${goal.id}/contributions`)).send({
        amount: 30000,
        contributionDate: '2026-01-15',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.goal).toMatchObject({ contributedAmount: 50000, remainingAmount: 50000, progressPercent: 50 });
      expect(res.body.data.contribution.amount).toBe(30000);
    });

    it('spec example: contributions exceeding the target cap progress at 100 without a negative remaining', async () => {
      const goal = await createGoal({ name: 'Fund', targetAmount: 100000 });
      const res = await auth(request(app()).post(`/api/goals/${goal.id}/contributions`)).send({
        amount: 120000,
        contributionDate: '2026-01-01',
      });
      expect(res.body.data.goal).toMatchObject({
        contributedAmount: 120000,
        remainingAmount: 0,
        progressPercent: 100,
        overfundedBy: 20000,
        status: 'completed',
      });
    });

    it('rejects a negative contribution amount', async () => {
      const goal = await createGoal();
      const res = await auth(request(app()).post(`/api/goals/${goal.id}/contributions`)).send({
        amount: -500,
        contributionDate: '2026-01-01',
      });
      expect(res.status).toBe(400);
    });

    it('returns 404 contributing to a nonexistent goal', async () => {
      const res = await auth(
        request(app()).post('/api/goals/99999999-9999-4999-8999-999999999999/contributions'),
      ).send({ amount: 100, contributionDate: '2026-01-01' });
      expect(res.status).toBe(404);
    });

    it('returns the full contribution history for a goal', async () => {
      const goal = await createGoal();
      await auth(request(app()).post(`/api/goals/${goal.id}/contributions`)).send({
        amount: 1000,
        contributionDate: '2026-01-01',
        note: 'First',
      });
      await auth(request(app()).post(`/api/goals/${goal.id}/contributions`)).send({
        amount: 2000,
        contributionDate: '2026-01-15',
        note: 'Second',
      });
      const res = await auth(request(app()).get(`/api/goals/${goal.id}/contributions`));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].note).toBe('Second'); // newest first
    });

    it('removes a contribution and the goal\'s progress recalculates', async () => {
      const goal = await createGoal({ name: 'Fund', targetAmount: 10000 });
      const contribRes = await auth(request(app()).post(`/api/goals/${goal.id}/contributions`)).send({
        amount: 4000,
        contributionDate: '2026-01-01',
      });
      const contributionId = contribRes.body.data.contribution.id;

      const deleteRes = await auth(request(app()).delete(`/api/goals/${goal.id}/contributions/${contributionId}`));
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.goal.contributedAmount).toBe(0);
    });

    it('returns 404 removing a nonexistent contribution', async () => {
      const goal = await createGoal();
      const res = await auth(
        request(app()).delete(`/api/goals/${goal.id}/contributions/99999999-9999-4999-8999-999999999999`),
      );
      expect(res.status).toBe(404);
    });
  });

  describe('cross-user ownership protection', () => {
    it('User B cannot retrieve, update, or delete User A\'s goal', async () => {
      const goal = await createGoal();
      const userB = await registerUser(app());
      const asB = (req) => req.set('Authorization', `Bearer ${userB.token}`);

      expect((await asB(request(app()).get(`/api/goals/${goal.id}`))).status).toBe(404);
      expect(
        (await asB(request(app()).put(`/api/goals/${goal.id}`)).send({ name: 'Hijacked', targetAmount: 1 })).status,
      ).toBe(404);
      expect((await asB(request(app()).delete(`/api/goals/${goal.id}`))).status).toBe(404);
    });

    it('User B cannot add a contribution to or view contributions for User A\'s goal', async () => {
      const goal = await createGoal();
      const userB = await registerUser(app());
      const asB = (req) => req.set('Authorization', `Bearer ${userB.token}`);

      const contribRes = await asB(request(app()).post(`/api/goals/${goal.id}/contributions`)).send({
        amount: 500,
        contributionDate: '2026-01-01',
      });
      expect(contribRes.status).toBe(404);

      const historyRes = await asB(request(app()).get(`/api/goals/${goal.id}/contributions`));
      expect(historyRes.status).toBe(404);

      // Prove User B's rejected attempt did not actually create a contribution.
      const ownerRes = await auth(request(app()).get(`/api/goals/${goal.id}`));
      expect(ownerRes.body.data.contributedAmount).toBe(0);
    });

    it('User B\'s goal list never includes User A\'s goals', async () => {
      await createGoal();
      const userB = await registerUser(app());
      const res = await request(app()).get('/api/goals').set('Authorization', `Bearer ${userB.token}`);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
