/**
 * Error with an HTTP status and a stable machine-readable code.
 * Throw this from services/middleware; the central error handler formats it as
 * { error: { code, message, details? } }.
 */
export class AppError extends Error {
  /**
   * @param {number} status   HTTP status code
   * @param {string} code     stable code, e.g. VALIDATION_ERROR, UNAUTHENTICATED
   * @param {string} message  safe, human-readable message
   * @param {Array<{field: string|null, message: string}>} [details] optional field-level errors
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
