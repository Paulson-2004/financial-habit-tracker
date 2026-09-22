import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

/** Issues a signed access token. The only claims are `sub` (user id), `iat` and `exp`. */
export function signToken(userId) {
  return jwt.sign({}, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/** Verifies signature (HS256 only) and expiry. Throws a jsonwebtoken error when invalid. */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
}
