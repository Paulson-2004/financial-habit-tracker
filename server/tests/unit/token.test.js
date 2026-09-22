import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from '../../src/utils/token.js';

const SAMPLE_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('JWT token utils', () => {
  it('round-trips the subject claim', () => {
    const token = signToken(SAMPLE_USER_ID);
    const payload = verifyToken(token);
    expect(payload.sub).toBe(SAMPLE_USER_ID);
  });

  it('rejects a tampered token', () => {
    const token = signToken(SAMPLE_USER_ID);
    const tampered = `${token.slice(0, -2)}xx`;
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('rejects an unsigned "none" algorithm token', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: SAMPLE_USER_ID })).toString('base64url');
    expect(() => verifyToken(`${header}.${payload}.`)).toThrow();
  });
});
