import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';

// Runs only when TEST_DATABASE_URL is set - see README "Testing" and .env.example.
describe.skipIf(!hasTestDatabase)('auth + RBAC', () => {
  let app;
  let closePool;
  let promoteToAdmin;
  let findUserByEmail;

  const validUser = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'abc12345' };

  beforeAll(async () => {
    ({ createApp: app } = await import('../../src/app.js'));
    ({ closePool } = await import('../../src/db/pool.js'));
    ({ promoteToAdmin, findUserByEmail } = await import('../../src/db/queries/users.js'));
  });

  beforeEach(() => resetTestDatabase());
  afterAll(() => closePool());

  describe('POST /api/auth/register', () => {
    it('creates a user and returns a token', async () => {
      const res = await request(app()).post('/api/auth/register').send(validUser);
      expect(res.status).toBe(201);
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.user).toMatchObject({ name: validUser.name, email: validUser.email, role: 'user' });
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects a duplicate email with 409', async () => {
      await request(app()).post('/api/auth/register').send(validUser);
      const res = await request(app()).post('/api/auth/register').send(validUser);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('rejects a weak password with 400 and a field-level error', async () => {
      const res = await request(app())
        .post('/api/auth/register')
        .send({ ...validUser, password: 'weak' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      // Body fields carry their bare name (no "body." prefix) so the client can map them
      // straight onto react-hook-form field names - see src/middleware/validate.js.
      expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
    });

    it('rejects an attempt to self-assign the admin role', async () => {
      const res = await request(app())
        .post('/api/auth/register')
        .send({ ...validUser, role: 'admin' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(() => request(app()).post('/api/auth/register').send(validUser));

    it('logs in with correct credentials', async () => {
      const res = await request(app())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toEqual(expect.any(String));
    });

    it('rejects a wrong password with 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'wrong-password' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns the same error for an unknown email (no user enumeration)', async () => {
      const res = await request(app())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever1' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects a deactivated account with 403', async () => {
      const { pool } = await import('../../src/db/pool.js');
      await pool.query('UPDATE users SET is_active = FALSE WHERE email = $1', [validUser.email]);
      const res = await request(app())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('GET /api/auth/me (protected route)', () => {
    it('rejects a request with no token', async () => {
      const res = await request(app()).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects a malformed token', async () => {
      const res = await request(app()).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });

    it('returns the current user for a valid token', async () => {
      const registerRes = await request(app()).post('/api/auth/register').send(validUser);
      const token = registerRes.body.data.token;
      const res = await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('rejects a token belonging to a now-deactivated user', async () => {
      const registerRes = await request(app()).post('/api/auth/register').send(validUser);
      const token = registerRes.body.data.token;
      const user = await findUserByEmail(validUser.email);
      const { pool } = await import('../../src/db/pool.js');
      await pool.query('UPDATE users SET is_active = FALSE WHERE id = $1', [user.id]);

      const res = await request(app()).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });

  describe('admin role middleware (GET /api/admin/ping)', () => {
    it('rejects a regular authenticated user with 403', async () => {
      const registerRes = await request(app()).post('/api/auth/register').send(validUser);
      const token = registerRes.body.data.token;
      const res = await request(app()).get('/api/admin/ping').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows an admin user', async () => {
      const registerRes = await request(app()).post('/api/auth/register').send(validUser);
      const token = registerRes.body.data.token;
      const user = await findUserByEmail(validUser.email);
      await promoteToAdmin(user.id);

      const res = await request(app()).get('/api/admin/ping').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('admin');
    });

    it('rejects an unauthenticated request before the role check runs', async () => {
      const res = await request(app()).get('/api/admin/ping');
      expect(res.status).toBe(401);
    });
  });
});
