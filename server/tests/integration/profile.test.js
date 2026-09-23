import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

describe.skipIf(!hasTestDatabase)('financial profile', () => {
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

  describe('GET /api/users/me', () => {
    it('returns the default profile created at registration', async () => {
      const res = await auth(request(app()).get('/api/users/me'));
      expect(res.status).toBe(200);
      expect(res.body.data.profile).toMatchObject({
        currency: 'INR',
        occupation: null,
        monthlyBudget: null,
        monthlySavingsTarget: null,
      });
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).get('/api/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('updates a subset of fields', async () => {
      const res = await auth(request(app()).patch('/api/users/me')).send({
        currency: 'usd',
        monthlyBudget: 2000,
      });
      expect(res.status).toBe(200);
      expect(res.body.data.profile).toMatchObject({ currency: 'USD', monthlyBudget: 2000 });
    });

    it('leaves fields not included in the request unchanged', async () => {
      await auth(request(app()).patch('/api/users/me')).send({ occupation: 'Engineer' });
      const res = await auth(request(app()).patch('/api/users/me')).send({ monthlyBudget: 500 });
      expect(res.body.data.profile).toMatchObject({ occupation: 'Engineer', monthlyBudget: 500 });
    });

    it('clears a field when explicitly set to null', async () => {
      await auth(request(app()).patch('/api/users/me')).send({ occupation: 'Engineer' });
      const res = await auth(request(app()).patch('/api/users/me')).send({ occupation: null });
      expect(res.body.data.profile.occupation).toBeNull();
    });

    it('rejects a negative monthly budget', async () => {
      const res = await auth(request(app()).patch('/api/users/me')).send({ monthlyBudget: -100 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a negative savings target', async () => {
      const res = await auth(request(app()).patch('/api/users/me')).send({ monthlySavingsTarget: -1 });
      expect(res.status).toBe(400);
    });

    it('rejects an invalid currency code', async () => {
      const res = await auth(request(app()).patch('/api/users/me')).send({ currency: 'USDX' });
      expect(res.status).toBe(400);
    });

    it('rejects an empty body', async () => {
      const res = await auth(request(app()).patch('/api/users/me')).send({});
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).patch('/api/users/me').send({ monthlyBudget: 100 });
      expect(res.status).toBe(401);
    });

    it('only updates the authenticated user\'s own profile', async () => {
      const userB = await registerUser(app());
      await auth(request(app()).patch('/api/users/me')).send({ monthlyBudget: 111 });

      const bRes = await request(app()).get('/api/users/me').set('Authorization', `Bearer ${userB.token}`);
      expect(bRes.body.data.profile.monthlyBudget).toBeNull();
    });
  });
});
