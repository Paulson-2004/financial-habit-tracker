import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword, getDummyHash } from '../utils/password.js';
import { signToken, verifyToken } from '../utils/token.js';
import { uuidSchema } from '../validators/common.js';
import { withTransaction } from '../db/pool.js';
import * as usersDb from '../db/queries/users.js';

/** The only user shape ever sent to clients. Never includes password_hash. */
export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/** Creates a user (role is always 'user') and their default financial profile atomically. */
export async function register({ name, email, password }) {
  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await withTransaction(async (tx) => {
      const created = await usersDb.insertUser({ name, email, passwordHash, role: 'user' }, tx);
      await usersDb.insertDefaultProfile(created.id, tx);
      return created;
    });
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'users_email_key') {
      throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.', [
        { field: 'email', message: 'An account with this email already exists' },
      ]);
    }
    throw error;
  }

  return { token: signToken(user.id), user: toPublicUser(user) };
}

/**
 * Verifies credentials. Unknown email and wrong password produce the same error, and a
 * dummy bcrypt comparison keeps response time similar, so accounts cannot be enumerated.
 */
export async function login({ email, password }) {
  const user = await usersDb.findUserByEmail(email);

  const passwordOk = await verifyPassword(password, user ? user.passwordHash : await getDummyHash());
  if (!user || !passwordOk) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account has been disabled.');
  }

  await usersDb.touchLastLogin(user.id);
  return { token: signToken(user.id), user: toPublicUser(user) };
}

/** Resolves a bearer token to the current, active user or throws 401. */
export async function authenticateToken(token) {
  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid authentication token.';
    throw new AppError(401, 'UNAUTHENTICATED', message);
  }

  if (!uuidSchema.safeParse(payload.sub).success) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid authentication token.');
  }

  const user = await usersDb.findUserById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Account not found or disabled.');
  }
  return toPublicUser(user);
}
