import { AppError } from '../utils/AppError.js';

/**
 * Role guard. Must run AFTER `authenticate`.
 *   router.use(authenticate, requireRole('admin'))
 * The role always comes from the database (via authenticate), never from the token or the client.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    return next();
  };
}
