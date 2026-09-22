import { describe, expect, it } from 'vitest';
import { getDummyHash, hashPassword, verifyPassword } from '../../src/utils/password.js';

describe('password hashing', () => {
  it('hashes a password so it no longer matches the plain text', async () => {
    const hash = await hashPassword('correct-horse-battery-staple1');
    expect(hash).not.toBe('correct-horse-battery-staple1');
    expect(hash.startsWith('$2')).toBe(true); // bcrypt hash prefix
  });

  it('verifies a correct password and rejects an incorrect one', async () => {
    const hash = await hashPassword('correct-horse-battery-staple1');
    await expect(verifyPassword('correct-horse-battery-staple1', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('exposes a stable dummy hash for timing-safe login checks', async () => {
    const first = await getDummyHash();
    const second = await getDummyHash();
    expect(first).toBe(second); // memoized, not re-hashed on every call
  });
});
