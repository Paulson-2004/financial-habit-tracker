import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { hasTestDatabase, resetTestDatabase } from '../helpers/testDb.js';

describe.skipIf(!hasTestDatabase)('GET /api/health', () => {
  let app;
  let closePool;

  beforeAll(async () => {
    await resetTestDatabase();
    ({ createApp: app } = await import('../../src/app.js'));
    ({ closePool } = await import('../../src/db/pool.js'));
  });

  afterAll(() => closePool());

  it('reports database connectivity', async () => {
    const res = await request(app()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('up');
  });
});
