import { describe, expect, it, vi } from 'vitest';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler.js';
import { AppError } from '../../src/utils/AppError.js';

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.headersSent = false;
  return res;
}

describe('errorHandler', () => {
  it('formats an AppError with its own status/code/message', () => {
    const res = mockRes();
    errorHandler(new AppError(409, 'EMAIL_TAKEN', 'Email taken.'), {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'EMAIL_TAKEN', message: 'Email taken.' } });
  });

  it('includes field-level details when present', () => {
    const res = mockRes();
    const details = [{ field: 'email', message: 'Required' }];
    errorHandler(new AppError(400, 'VALIDATION_ERROR', 'Invalid.', details), {}, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'VALIDATION_ERROR', message: 'Invalid.', details } });
  });

  it('maps a unique-violation Postgres error to 409 without leaking the constraint name', () => {
    const res = mockRes();
    const pgError = Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), {
      code: '23505',
    });
    errorHandler(pgError, { method: 'POST', path: '/api/auth/register' }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error.message).not.toMatch(/constraint/);
  });

  it('never leaks an unknown error message to the client', () => {
    const res = mockRes();
    errorHandler(new Error('leaked internal detail'), { method: 'GET', path: '/api/x' }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.message).not.toMatch(/leaked internal detail/);
  });
});

describe('notFoundHandler', () => {
  it('passes a 404 AppError to next()', () => {
    const next = vi.fn();
    notFoundHandler({ method: 'GET', path: '/api/nope' }, {}, next);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(404);
  });
});
