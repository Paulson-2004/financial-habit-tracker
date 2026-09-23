import request from 'supertest';

let counter = 0;

/** A fresh, valid registration payload each call, so tests never collide on email. */
export function uniqueUser(overrides = {}) {
  counter += 1;
  return { name: `Test User ${counter}`, email: `user${counter}@example.com`, password: 'abc12345', ...overrides };
}

/** Registers a new user against `app` (an Express instance) and returns { token, user }. */
export async function registerUser(app, overrides = {}) {
  const res = await request(app).post('/api/auth/register').send(uniqueUser(overrides));
  return res.body.data; // { token, user }
}
