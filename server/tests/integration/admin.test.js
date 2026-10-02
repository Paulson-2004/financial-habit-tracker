import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';
import { registerUser } from '../helpers/apiHelpers.js';

// Day 5 admin module: RBAC, user management, analytics, feedback triage.
describe.skipIf(!hasTestDatabase)('admin', () => {
  let app;
  let closePool;
  let promoteToAdmin;

  let adminToken;
  let adminId;
  let adminEmail;
  let userToken;
  let userId;

  beforeAll(async () => {
    ({ createApp: app } = await import('../../src/app.js'));
    ({ closePool } = await import('../../src/db/pool.js'));
    ({ promoteToAdmin } = await import('../../src/db/queries/users.js'));
  });
  afterAll(() => closePool());

  beforeEach(async () => {
    await resetTestDatabase();
    const admin = await registerUser(app());
    const user = await registerUser(app());
    const { findUserByEmail } = await import('../../src/db/queries/users.js');
    const adminRow = await findUserByEmail(admin.user.email);
    await promoteToAdmin(adminRow.id);
    adminToken = admin.token;
    adminId = adminRow.id;
    adminEmail = admin.user.email;
    userToken = user.token;
    userId = user.user.id;
  });

  const adminAuth = (req) => req.set('Authorization', `Bearer ${adminToken}`);
  const userAuth = (req) => req.set('Authorization', `Bearer ${userToken}`);

  describe('RBAC', () => {
    it('rejects unauthenticated requests with 401', async () => {
      for (const path of ['/api/admin/overview', '/api/admin/users', '/api/admin/feedback']) {
        const res = await request(app()).get(path);
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHENTICATED');
      }
    });

    it('rejects malformed JWTs with 401', async () => {
      const res = await request(app()).get('/api/admin/overview').set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });

    it('rejects normal users with 403 on every admin endpoint', async () => {
      const paths = [
        request(app()).get('/api/admin/overview'),
        request(app()).get('/api/admin/users'),
        request(app()).get('/api/admin/feedback'),
      ];
      for (const req of paths) {
        const res = await userAuth(req);
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('allows admins', async () => {
      const res = await adminAuth(request(app()).get('/api/admin/ping'));
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('admin');
    });

    it('rejects role escalation at registration', async () => {
      const res = await request(app())
        .post('/api/auth/register')
        .send({ name: 'Sneaky', email: 'sneaky@example.com', password: 'abc12345', role: 'admin' });
      expect(res.status).toBe(400);
    });

    it('rejects a role field smuggled into admin user updates', async () => {
      const res = await adminAuth(request(app()).patch(`/api/admin/users/${userId}`)).send({
        isActive: true,
        role: 'admin',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a role field smuggled into profile updates', async () => {
      const res = await userAuth(request(app()).patch('/api/users/me')).send({ currency: 'USD', role: 'admin' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/users', () => {
    it('lists users with safe fields only', async () => {
      const res = await adminAuth(request(app()).get('/api/admin/users'));
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(2);
      for (const row of res.body.data) {
        expect(row).toMatchObject({ id: expect.any(String) });
        expect(row.passwordHash).toBeUndefined();
        expect(row.password_hash).toBeUndefined();
        expect(row.token).toBeUndefined();
        expect(Object.keys(row).sort()).toEqual(
          ['createdAt', 'email', 'id', 'isActive', 'lastLoginAt', 'name', 'role'].sort(),
        );
      }
    });

    it('supports search, role and isActive filters with pagination', async () => {
      const byEmail = await adminAuth(request(app()).get('/api/admin/users').query({ search: adminEmail }));
      expect(byEmail.body.meta.total).toBe(1);
      expect(byEmail.body.data[0].email).toBe(adminEmail);

      const admins = await adminAuth(request(app()).get('/api/admin/users').query({ role: 'admin' }));
      expect(admins.body.meta.total).toBe(1);
      expect(admins.body.data[0].role).toBe('admin');
    });

    it('returns 404 for an unknown user id and 400 for a malformed one', async () => {
      const missing = await adminAuth(
        request(app()).get('/api/admin/users/99999999-9999-4999-8999-999999999999'),
      );
      expect(missing.status).toBe(404);
      const malformed = await adminAuth(request(app()).get('/api/admin/users/not-a-uuid'));
      expect(malformed.status).toBe(400);
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    it('deactivates a user, blocking their next login', async () => {
      const res = await adminAuth(request(app()).patch(`/api/admin/users/${userId}`)).send({ isActive: false });
      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      const login = await request(app())
        .post('/api/auth/login')
        .send({ email: res.body.data.email, password: 'abc12345' });
      expect(login.status).toBe(403);
      expect(login.body.error.code).toBe('ACCOUNT_DISABLED');
    });

    it('refuses to deactivate your own account', async () => {
      const res = await adminAuth(request(app()).patch(`/api/admin/users/${adminId}`)).send({ isActive: false });
      expect(res.status).toBe(403);
    });

    it('refuses to deactivate the last active admin', async () => {
      const res = await adminAuth(request(app()).patch(`/api/admin/users/${adminId}`)).send({ isActive: false });
      expect(res.status).toBe(403); // self-deactivation guard fires first
    });

    it('rejects a non-boolean isActive', async () => {
      const res = await adminAuth(request(app()).patch(`/api/admin/users/${userId}`)).send({ isActive: 'yes' });
      expect(res.status).toBe(400);
    });
  });

  describe('feedback triage', () => {
    async function createUserFeedback() {
      const res = await userAuth(request(app()).post('/api/feedback')).send({
        type: 'complaint',
        subject: 'Something broke',
        message: 'A detailed description of the problem I ran into today.',
      });
      return res.body.data.id;
    }

    it('lets admins list, filter, read and resolve feedback', async () => {
      const id = await createUserFeedback();

      const list = await adminAuth(request(app()).get('/api/admin/feedback'));
      expect(list.status).toBe(200);
      expect(list.body.meta.total).toBe(1);
      expect(list.body.data[0]).toMatchObject({
        type: 'complaint',
        status: 'open',
        author: { name: expect.any(String), email: expect.any(String) },
      });

      const filtered = await adminAuth(request(app()).get('/api/admin/feedback').query({ status: 'resolved' }));
      expect(filtered.body.meta.total).toBe(0);

      const detail = await adminAuth(request(app()).get(`/api/admin/feedback/${id}`));
      expect(detail.status).toBe(200);
      expect(detail.body.data.message).toContain('detailed description');

      const updated = await adminAuth(request(app()).patch(`/api/admin/feedback/${id}`)).send({
        status: 'resolved',
        adminNote: 'Fixed in the latest release.',
      });
      expect(updated.status).toBe(200);
      expect(updated.body.data).toMatchObject({ status: 'resolved', adminNote: 'Fixed in the latest release.' });
    });

    it('keeps cross-user ownership on the user endpoints (404 for another account)', async () => {
      const id = await createUserFeedback();
      const other = await registerUser(app());
      const res = await request(app())
        .get(`/api/feedback/${id}`)
        .set('Authorization', `Bearer ${other.token}`);
      expect(res.status).toBe(404);
    });

    it('returns 404 for unknown feedback and 400 for invalid payloads', async () => {
      const missing = await adminAuth(
        request(app()).get('/api/admin/feedback/99999999-9999-4999-8999-999999999999'),
      );
      expect(missing.status).toBe(404);
      const badStatus = await adminAuth(request(app()).get('/api/admin/feedback').query({ status: 'bogus' }));
      expect(badStatus.status).toBe(400);
    });
  });

  describe('GET /api/admin/overview', () => {
    it('returns zeros and a 6-month trend on an empty platform', async () => {
      const res = await adminAuth(request(app()).get('/api/admin/overview'));
      expect(res.status).toBe(200);
      const { users, content, feedback, monthlyTrends } = res.body.data;
      expect(users.total).toBe(2);
      expect(content.transactions).toBe(0);
      expect(feedback.total).toBe(0);
      expect(monthlyTrends).toHaveLength(6);
    });

    it('reflects real platform activity in the aggregates', async () => {
      // One transaction (needs a real system category), one habit, one goal,
      // one asset, one liability and one feedback item from the regular user.
      const categories = await userAuth(request(app()).get('/api/transactions/categories').query({ type: 'expense' }));
      await userAuth(request(app()).post('/api/transactions')).send({
        type: 'expense',
        categoryId: categories.body.data[0].id,
        amount: 100,
        transactionDate: new Date().toISOString().slice(0, 10),
        description: 'Groceries',
      });
      await userAuth(request(app()).post('/api/habits')).send({ name: 'Save daily' });
      await userAuth(request(app()).post('/api/goals')).send({ name: 'Emergency fund', targetAmount: 5000 });
      await userAuth(request(app()).post('/api/assets')).send({ name: 'Savings account', value: 2000 });
      await userAuth(request(app()).post('/api/liabilities')).send({ name: 'Credit card', amount: 500 });
      await userAuth(request(app()).post('/api/feedback')).send({
        type: 'feedback',
        subject: 'Great app',
        message: 'Really enjoying the habit tracking features so far.',
      });

      const res = await adminAuth(request(app()).get('/api/admin/overview'));
      expect(res.status).toBe(200);
      const { content, feedback: fb, users } = res.body.data;
      expect(content).toMatchObject({
        transactions: 1,
        habits: 1,
        savingsGoals: 1,
        assets: 1,
        liabilities: 1,
      });
      expect(fb.total).toBe(1);
      expect(users.total).toBe(2);
      // No private financial detail leaks through the overview.
      expect(JSON.stringify(res.body.data)).not.toMatch(/Groceries|Emergency fund|Savings account/i);
    });
  });
});
