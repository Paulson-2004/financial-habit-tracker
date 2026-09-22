import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.BCRYPT_COST);
}

export function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

// Used to keep login timing similar when the email does not exist.
let dummyHash;
export function getDummyHash() {
  dummyHash ??= bcrypt.hash('not-a-real-password', env.BCRYPT_COST);
  return dummyHash;
}
