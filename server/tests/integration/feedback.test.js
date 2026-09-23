import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

describe.skipIf(!hasTestDatabase)('feedback', () => {
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

  describe('POST /api/feedback', () => {
    it('creates a feedback submission', async () => {
      const res = await auth(request(app()).post('/api/feedback')).send({
        type: 'feedback',
        subject: 'Love the app',
        message: 'The transaction tracker is really easy to use.',
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ type: 'feedback', subject: 'Love the app', status: 'open' });
      expect(res.body.data.userId).toBeUndefined();
    });

    it('creates a complaint submission', async () => {
      const res = await auth(request(app()).post('/api/feedback')).send({
        type: 'complaint',
        subject: 'Bug in dashboard',
        message: 'The numbers do not add up correctly on the report page.',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('complaint');
    });

    it('rejects a message that is too short', async () => {
      const res = await auth(request(app()).post('/api/feedback')).send({
        type: 'feedback',
        subject: 'Hi',
        message: 'short',
      });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app())
        .post('/api/feedback')
        .send({ type: 'feedback', subject: 'Hi there', message: 'This should not be allowed at all.' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/feedback/mine', () => {
    it('lists only the current user\'s feedback, newest first', async () => {
      await auth(request(app()).post('/api/feedback')).send({
        type: 'feedback',
        subject: 'First one',
        message: 'This is the first feedback message I am sending in.',
      });
      await auth(request(app()).post('/api/feedback')).send({
        type: 'complaint',
        subject: 'Second one',
        message: 'This is the second feedback message I am sending in.',
      });

      const res = await auth(request(app()).get('/api/feedback/mine'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].subject).toBe('Second one');
      expect(res.body.meta.total).toBe(2);
    });

    it('never includes another user\'s feedback', async () => {
      await auth(request(app()).post('/api/feedback')).send({
        type: 'feedback',
        subject: 'User A feedback',
        message: 'This message belongs to user A and no one else.',
      });
      const userB = await registerUser(app());
      const res = await request(app()).get('/api/feedback/mine').set('Authorization', `Bearer ${userB.token}`);
      expect(res.body.data).toHaveLength(0);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).get('/api/feedback/mine');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/feedback/:id (cross-user ownership protection)', () => {
    it('retrieves the owner\'s own feedback', async () => {
      const createRes = await auth(request(app()).post('/api/feedback')).send({
        type: 'feedback',
        subject: 'Detail view test',
        message: 'Checking that a single feedback item can be retrieved by id.',
      });
      const res = await auth(request(app()).get(`/api/feedback/${createRes.body.data.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.subject).toBe('Detail view test');
    });

    it('User B cannot retrieve User A\'s feedback', async () => {
      const createRes = await auth(request(app()).post('/api/feedback')).send({
        type: 'feedback',
        subject: 'User A only',
        message: 'This should never be visible to another account.',
      });
      const userB = await registerUser(app());
      const res = await request(app())
        .get(`/api/feedback/${createRes.body.data.id}`)
        .set('Authorization', `Bearer ${userB.token}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 for a nonexistent id', async () => {
      const res = await auth(request(app()).get('/api/feedback/99999999-9999-4999-8999-999999999999'));
      expect(res.status).toBe(404);
    });
  });
});
