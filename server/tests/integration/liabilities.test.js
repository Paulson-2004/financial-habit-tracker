import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

describe.skipIf(!hasTestDatabase)('liabilities', () => {
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

  async function createLiability(body = { name: 'Car loan', category: 'vehicle_loan', amount: 200000 }) {
    const res = await auth(request(app()).post('/api/liabilities')).send(body);
    return res.body.data;
  }

  describe('POST /api/liabilities', () => {
    it('creates a liability', async () => {
      const res = await auth(request(app()).post('/api/liabilities')).send({
        name: 'Credit card',
        category: 'credit_card',
        amount: 15000,
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'Credit card', category: 'credit_card', amount: 15000 });
    });

    it('defaults category to "other" when omitted', async () => {
      const res = await auth(request(app()).post('/api/liabilities')).send({ name: 'Informal loan', amount: 5000 });
      expect(res.body.data.category).toBe('other');
    });

    it('rejects a zero or negative amount', async () => {
      const zeroRes = await auth(request(app()).post('/api/liabilities')).send({ name: 'Bad', amount: 0 });
      expect(zeroRes.status).toBe(400);
      const negRes = await auth(request(app()).post('/api/liabilities')).send({ name: 'Bad', amount: -100 });
      expect(negRes.status).toBe(400);
    });

    it('rejects an invalid category', async () => {
      const res = await auth(request(app()).post('/api/liabilities')).send({
        name: 'Overdraft',
        category: 'overdraft',
        amount: 100,
      });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).post('/api/liabilities').send({ name: 'Loan', amount: 100 });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/liabilities and /api/liabilities/:id', () => {
    it('lists the user\'s liabilities', async () => {
      await createLiability({ name: 'Liability A', amount: 100 });
      await createLiability({ name: 'Liability B', amount: 200 });
      const res = await auth(request(app()).get('/api/liabilities'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('retrieves a single liability by id', async () => {
      const liability = await createLiability();
      const res = await auth(request(app()).get(`/api/liabilities/${liability.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(liability.id);
    });

    it('returns 404 for a nonexistent liability id', async () => {
      const res = await auth(request(app()).get('/api/liabilities/99999999-9999-4999-8999-999999999999'));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/liabilities/:id and DELETE /api/liabilities/:id', () => {
    it('updates a single field, leaving the rest unchanged (PATCH semantics)', async () => {
      const liability = await createLiability({ name: 'Original', category: 'personal_loan', amount: 10000 });
      const res = await auth(request(app()).patch(`/api/liabilities/${liability.id}`)).send({ amount: 8000 });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'Original', category: 'personal_loan', amount: 8000 });
    });

    it('rejects an empty PATCH body', async () => {
      const liability = await createLiability();
      const res = await auth(request(app()).patch(`/api/liabilities/${liability.id}`)).send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 updating a nonexistent liability', async () => {
      const res = await auth(request(app()).patch('/api/liabilities/99999999-9999-4999-8999-999999999999')).send({
        amount: 100,
      });
      expect(res.status).toBe(404);
    });

    it('deletes a liability', async () => {
      const liability = await createLiability();
      const deleteRes = await auth(request(app()).delete(`/api/liabilities/${liability.id}`));
      expect(deleteRes.status).toBe(204);
      const getRes = await auth(request(app()).get(`/api/liabilities/${liability.id}`));
      expect(getRes.status).toBe(404);
    });
  });

  describe('cross-user ownership protection', () => {
    it('User B cannot retrieve, update, or delete User A\'s liability', async () => {
      const liability = await createLiability();
      const userB = await registerUser(app());
      const asB = (req) => req.set('Authorization', `Bearer ${userB.token}`);

      expect((await asB(request(app()).get(`/api/liabilities/${liability.id}`))).status).toBe(404);
      expect(
        (await asB(request(app()).patch(`/api/liabilities/${liability.id}`)).send({ amount: 1 })).status,
      ).toBe(404);
      expect((await asB(request(app()).delete(`/api/liabilities/${liability.id}`))).status).toBe(404);

      const stillThereRes = await auth(request(app()).get(`/api/liabilities/${liability.id}`));
      expect(stillThereRes.status).toBe(200);
    });

    it('User B\'s liability list never includes User A\'s liabilities', async () => {
      await createLiability();
      const userB = await registerUser(app());
      const res = await request(app()).get('/api/liabilities').set('Authorization', `Bearer ${userB.token}`);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
