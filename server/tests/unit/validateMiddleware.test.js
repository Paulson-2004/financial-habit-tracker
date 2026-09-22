import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';

describe('validate middleware', () => {
  it('calls next() and sets req.valid on success', () => {
    const middleware = validate({ body: z.object({ email: z.string().email() }) });
    const req = { body: { email: 'ada@example.com' } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith(); // called with no error
    expect(req.valid.body).toEqual({ email: 'ada@example.com' });
  });

  it('passes a 400 VALIDATION_ERROR with field details to next() on failure', () => {
    const middleware = validate({ body: z.object({ email: z.string().email() }) });
    const req = { body: { email: 'not-an-email' } };
    const next = vi.fn();

    middleware(req, {}, next);

    const error = next.mock.calls[0][0];
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details[0].field).toBe('email');
  });
});
