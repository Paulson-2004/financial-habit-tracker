import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../../src/validators/authValidators.js';

describe('registerSchema', () => {
  it('accepts a valid payload and normalizes the email', () => {
    const result = registerSchema.safeParse({ name: 'Ada Lovelace', email: 'ADA@Example.com', password: 'abc12345' });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('ada@example.com');
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: 'abc123' });
    expect(result.success).toBe(false);
  });

  it('rejects a password with no letters', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects a password with no digits', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: 'abcdefgh' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown field (mass-assignment guard)', () => {
    const result = registerSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'abc12345',
      role: 'admin',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = registerSchema.safeParse({ name: 'A', email: 'ada@example.com', password: 'abc12345' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse({ name: 'Ada', email: 'not-an-email', password: 'abc12345' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts a valid payload', () => {
    const result = loginSchema.safeParse({ email: 'ada@example.com', password: 'anything' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'ada@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('does not enforce password strength on login', () => {
    // Login must accept an old, weaker password that predates a strength-rule change.
    const result = loginSchema.safeParse({ email: 'ada@example.com', password: 'weak' });
    expect(result.success).toBe(true);
  });
});
