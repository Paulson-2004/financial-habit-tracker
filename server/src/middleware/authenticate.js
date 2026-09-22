import { AppError } from '../utils/AppError.js';
import * as authService from '../services/authService.js';

/**
 * Requires a valid `Authorization: Bearer <jwt>` header.
 * Loads the user from the database on every request, so deactivation and role changes
 * take effect immediately. Sets req.user = { id, name, email, role, createdAt }.
 */
export async function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
  }

  req.user = await authService.authenticateToken(token);
  next();
}
