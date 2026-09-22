import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.path}`));
}

// PostgreSQL error classes that indicate bad client data rather than a server fault.
const DB_BAD_DATA_CODES = new Set(['23502', '23514', '22P02', '22003', '22007', '22008']);

function toResponse(error) {
  if (error instanceof AppError) {
    return { status: error.status, code: error.code, message: error.message, details: error.details };
  }
  // body-parser errors (express.json)
  if (error.type === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', message: 'Request body is not valid JSON.' };
  }
  if (error.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' };
  }
  // Database constraint errors that slipped past validation.
  if (error.code === '23505') {
    return { status: 409, code: 'CONFLICT', message: 'A record with these values already exists.' };
  }
  if (error.code === '23503') {
    return { status: 409, code: 'CONFLICT', message: 'This action conflicts with related records.' };
  }
  if (DB_BAD_DATA_CODES.has(error.code)) {
    return { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid data.' };
  }
  return { status: 500, code: 'INTERNAL', message: 'Something went wrong. Please try again later.' };
}

/**
 * Central error handler - the only place that formats errors.
 * Response shape: { error: { code, message, details? } }. Stack traces and raw
 * database/library messages are never sent to clients.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const { status, code, message, details } = toResponse(error);

  if (status >= 500 && !env.isTest) {
    console.error(`[${req.method} ${req.path}]`, error);
  }

  const body = { error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}
