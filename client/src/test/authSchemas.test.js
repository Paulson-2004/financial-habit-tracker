import { describe, expect, it } from 'vitest';
import { loginFormSchema, registerFormSchema } from '../schemas/authSchemas.js';

describe('registerFormSchema', () => {
  it('accepts a valid payload', () => {
    const result = registerFormSchema.safeParse({ name: 'Ada Lovelace', email: 'ADA@Example.com', password: 'abc12345' });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('ada@example.com'); // trimmed + lowercased
  });

  it('rejects a password with no digit', () => {
    const result = registerFormSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: 'onlyletters' });
    expect(result.success).toBe(false);
  });
});

describe('loginFormSchema', () => {
  it('rejects an empty password', () => {
    const result = loginFormSchema.safeParse({ email: 'ada@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
