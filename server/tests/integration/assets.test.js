import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

describe.skipIf(!hasTestDatabase)('assets', () => {
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

  async function createAsset(body = { name: 'Savings account', category: 'bank_account', value: 50000 }) {
    const res = await auth(request(app()).post('/api/assets')).send(body);
    return res.body.data;
  }

  describe('POST /api/assets', () => {
    it('creates an asset', async () => {
      const res = await auth(request(app()).post('/api/assets')).send({
        name: 'Gold coins',
        category: 'gold',
        value: 75000,
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'Gold coins', category: 'gold', value: 75000 });
    });

    it('defaults category to "other" when omitted', async () => {
      const res = await auth(request(app()).post('/api/assets')).send({ name: 'Misc valuables', value: 1000 });
      expect(res.body.data.category).toBe('other');
    });

    it('rejects a zero or negative value', async () => {
      const zeroRes = await auth(request(app()).post('/api/assets')).send({ name: 'Bad', value: 0 });
      expect(zeroRes.status).toBe(400);
      const negRes = await auth(request(app()).post('/api/assets')).send({ name: 'Bad', value: -100 });
      expect(negRes.status).toBe(400);
    });

    it('rejects an invalid category', async () => {
      const res = await auth(request(app()).post('/api/assets')).send({ name: 'Crypto wallet', category: 'crypto', value: 100 });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).post('/api/assets').send({ name: 'Asset', value: 100 });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/assets and /api/assets/:id', () => {
    it('lists the user\'s assets', async () => {
      await createAsset({ name: 'Asset A', value: 100 });
      await createAsset({ name: 'Asset B', value: 200 });
      const res = await auth(request(app()).get('/api/assets'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('returns an empty list with no assets', async () => {
      const res = await auth(request(app()).get('/api/assets'));
      expect(res.body.data).toEqual([]);
    });

    it('retrieves a single asset by id', async () => {
      const asset = await createAsset();
      const res = await auth(request(app()).get(`/api/assets/${asset.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(asset.id);
    });

    it('returns 404 for a nonexistent asset id', async () => {
      const res = await auth(request(app()).get('/api/assets/99999999-9999-4999-8999-999999999999'));
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/assets/:id and DELETE /api/assets/:id', () => {
    it('updates a single field, leaving the rest unchanged (PATCH semantics)', async () => {
      const asset = await createAsset({ name: 'Original', category: 'cash', value: 1000 });
      const res = await auth(request(app()).patch(`/api/assets/${asset.id}`)).send({ value: 2000 });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'Original', category: 'cash', value: 2000 });
    });

    it('rejects an empty PATCH body', async () => {
      const asset = await createAsset();
      const res = await auth(request(app()).patch(`/api/assets/${asset.id}`)).send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 updating a nonexistent asset', async () => {
      const res = await auth(request(app()).patch('/api/assets/99999999-9999-4999-8999-999999999999')).send({
        value: 100,
      });
      expect(res.status).toBe(404);
    });

    it('deletes an asset', async () => {
      const asset = await createAsset();
      const deleteRes = await auth(request(app()).delete(`/api/assets/${asset.id}`));
      expect(deleteRes.status).toBe(204);
      const getRes = await auth(request(app()).get(`/api/assets/${asset.id}`));
      expect(getRes.status).toBe(404);
    });
  });

  describe('cross-user ownership protection', () => {
    it('User B cannot retrieve, update, or delete User A\'s asset', async () => {
      const asset = await createAsset();
      const userB = await registerUser(app());
      const asB = (req) => req.set('Authorization', `Bearer ${userB.token}`);

      expect((await asB(request(app()).get(`/api/assets/${asset.id}`))).status).toBe(404);
      expect((await asB(request(app()).patch(`/api/assets/${asset.id}`)).send({ value: 1 })).status).toBe(404);
      expect((await asB(request(app()).delete(`/api/assets/${asset.id}`))).status).toBe(404);

      // Prove User B's rejected attempts did not modify or delete it.
      const stillThereRes = await auth(request(app()).get(`/api/assets/${asset.id}`));
      expect(stillThereRes.status).toBe(200);
    });

    it('User B\'s asset list never includes User A\'s assets', async () => {
      await createAsset();
      const userB = await registerUser(app());
      const res = await request(app()).get('/api/assets').set('Authorization', `Bearer ${userB.token}`);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
