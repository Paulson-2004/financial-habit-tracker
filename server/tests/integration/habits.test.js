import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

describe.skipIf(!hasTestDatabase)('habits', () => {
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

  async function createHabit(body = { name: 'Log every expense', category: 'budgeting' }) {
    const res = await auth(request(app()).post('/api/habits')).send(body);
    return res.body.data;
  }

  describe('POST /api/habits', () => {
    it('creates a habit with sensible defaults for an unenriched habit', async () => {
      const res = await auth(request(app()).post('/api/habits')).send({ name: 'Save daily' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Save daily',
        category: 'other',
        frequency: 'daily',
        isActive: true,
        completedToday: false,
        currentStreak: 0,
        longestStreak: 0,
      });
    });

    it('accepts an explicit category and description', async () => {
      const res = await auth(request(app()).post('/api/habits')).send({
        name: 'Review budget',
        description: 'Check spending against budget',
        category: 'budgeting',
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ category: 'budgeting', description: 'Check spending against budget' });
    });

    it('rejects a name shorter than 2 characters', async () => {
      const res = await auth(request(app()).post('/api/habits')).send({ name: 'A' });
      expect(res.status).toBe(400);
    });

    it('rejects an unauthenticated request', async () => {
      const res = await request(app()).post('/api/habits').send({ name: 'Save daily' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/habits and /api/habits/:id', () => {
    it('lists the user\'s habits', async () => {
      await createHabit({ name: 'Save daily' });
      await createHabit({ name: 'Track expenses' });
      const res = await auth(request(app()).get('/api/habits'));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('returns an empty list for a user with no habits', async () => {
      const res = await auth(request(app()).get('/api/habits'));
      expect(res.body.data).toEqual([]);
    });

    it('retrieves a single habit by id', async () => {
      const habit = await createHabit();
      const res = await auth(request(app()).get(`/api/habits/${habit.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(habit.id);
    });

    it('returns 404 for a nonexistent habit id', async () => {
      const res = await auth(request(app()).get('/api/habits/99999999-9999-4999-8999-999999999999'));
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/habits/:id and DELETE /api/habits/:id', () => {
    it('updates a habit\'s name, description, and category', async () => {
      const habit = await createHabit({ name: 'Original' });
      const res = await auth(request(app()).put(`/api/habits/${habit.id}`)).send({
        name: 'Updated',
        description: 'New description',
        category: 'investing',
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: 'Updated', description: 'New description', category: 'investing' });
    });

    it('resets category to "other" when omitted on update (PUT is a full replace)', async () => {
      const habit = await createHabit({ name: 'Original', category: 'saving' });
      const res = await auth(request(app()).put(`/api/habits/${habit.id}`)).send({ name: 'Updated' });
      expect(res.body.data.category).toBe('other');
    });

    it('returns 404 updating a nonexistent habit', async () => {
      const res = await auth(request(app()).put('/api/habits/99999999-9999-4999-8999-999999999999')).send({
        name: 'Updated',
      });
      expect(res.status).toBe(404);
    });

    it('deletes a habit', async () => {
      const habit = await createHabit();
      const deleteRes = await auth(request(app()).delete(`/api/habits/${habit.id}`));
      expect(deleteRes.status).toBe(204);
      const getRes = await auth(request(app()).get(`/api/habits/${habit.id}`));
      expect(getRes.status).toBe(404);
    });
  });

  describe('habit completions and streaks', () => {
    it('marks today complete and reflects it immediately', async () => {
      const habit = await createHabit();
      const res = await auth(request(app()).post(`/api/habits/${habit.id}/completions?today=2026-03-05`)).send({
        date: '2026-03-05',
      });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ completedToday: true, currentStreak: 1, longestStreak: 1 });
    });

    it('is idempotent - completing the same date twice does not change the streak', async () => {
      const habit = await createHabit();
      await auth(request(app()).post(`/api/habits/${habit.id}/completions?today=2026-03-05`)).send({ date: '2026-03-05' });
      const res = await auth(request(app()).post(`/api/habits/${habit.id}/completions?today=2026-03-05`)).send({
        date: '2026-03-05',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStreak).toBe(1);
    });

    it('builds a multi-day streak across separate completion calls', async () => {
      const habit = await createHabit();
      await auth(request(app()).post(`/api/habits/${habit.id}/completions?today=2026-03-01`)).send({ date: '2026-03-01' });
      await auth(request(app()).post(`/api/habits/${habit.id}/completions?today=2026-03-02`)).send({ date: '2026-03-02' });
      const res = await auth(request(app()).post(`/api/habits/${habit.id}/completions?today=2026-03-03`)).send({
        date: '2026-03-03',
      });
      expect(res.body.data).toMatchObject({ currentStreak: 3, longestStreak: 3 });
    });

    it('a backdated completion does not shift what "today" means for the response', async () => {
      const habit = await createHabit();
      // Mark a date from a week ago complete, but tell the server today is 2026-03-10.
      const res = await auth(request(app()).post(`/api/habits/${habit.id}/completions?today=2026-03-10`)).send({
        date: '2026-03-03',
      });
      expect(res.status).toBe(200);
      // Relative to the real "today" (03-10), that lone backdated entry doesn't touch
      // the current streak at all, and today itself is still not marked complete.
      expect(res.body.data).toMatchObject({ completedToday: false, currentStreak: 0, longestStreak: 1 });
    });

    it('rejects a future-dated completion beyond the allowance', async () => {
      const habit = await createHabit();
      const res = await auth(request(app()).post(`/api/habits/${habit.id}/completions`)).send({ date: '2099-01-01' });
      expect(res.status).toBe(400);
    });

    it('undoes a completion and the streak recalculates', async () => {
      const habit = await createHabit();
      await auth(request(app()).post(`/api/habits/${habit.id}/completions?today=2026-03-05`)).send({ date: '2026-03-05' });
      const res = await auth(
        request(app()).delete(`/api/habits/${habit.id}/completions/2026-03-05?today=2026-03-05`),
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ completedToday: false, currentStreak: 0 });
    });

    it('returns 404 undoing a completion that does not exist', async () => {
      const habit = await createHabit();
      const res = await auth(request(app()).delete(`/api/habits/${habit.id}/completions/2026-03-05`));
      expect(res.status).toBe(404);
    });

    it('returns the full completion history, sorted', async () => {
      const habit = await createHabit();
      await auth(request(app()).post(`/api/habits/${habit.id}/completions`)).send({ date: '2026-01-10' });
      await auth(request(app()).post(`/api/habits/${habit.id}/completions`)).send({ date: '2026-01-05' });
      const res = await auth(request(app()).get(`/api/habits/${habit.id}/completions`));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(['2026-01-05', '2026-01-10']);
    });
  });

  describe('cross-user ownership protection', () => {
    it('User B cannot retrieve, update, or delete User A\'s habit', async () => {
      const habit = await createHabit();
      const userB = await registerUser(app());
      const asB = (req) => req.set('Authorization', `Bearer ${userB.token}`);

      expect((await asB(request(app()).get(`/api/habits/${habit.id}`))).status).toBe(404);
      expect(
        (await asB(request(app()).put(`/api/habits/${habit.id}`)).send({ name: 'Hijacked' })).status,
      ).toBe(404);
      expect((await asB(request(app()).delete(`/api/habits/${habit.id}`))).status).toBe(404);
    });

    it('User B cannot mark or view completions for User A\'s habit', async () => {
      const habit = await createHabit();
      const userB = await registerUser(app());
      const asB = (req) => req.set('Authorization', `Bearer ${userB.token}`);

      const markRes = await asB(request(app()).post(`/api/habits/${habit.id}/completions`)).send({
        date: '2026-03-05',
      });
      expect(markRes.status).toBe(404);

      const historyRes = await asB(request(app()).get(`/api/habits/${habit.id}/completions`));
      expect(historyRes.status).toBe(404);

      // Prove User B's rejected attempt did not actually create a completion.
      const ownerHistoryRes = await auth(request(app()).get(`/api/habits/${habit.id}/completions`));
      expect(ownerHistoryRes.body.data).toEqual([]);
    });

    it('User B\'s habit list never includes User A\'s habits', async () => {
      await createHabit();
      const userB = await registerUser(app());
      const res = await request(app()).get('/api/habits').set('Authorization', `Bearer ${userB.token}`);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
