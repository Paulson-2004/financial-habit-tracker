import { AppError } from '../utils/AppError.js';

function formatIssues(location, error) {
  return error.issues.map((issue) => {
    const path = [...(location === 'body' ? [] : [location]), ...issue.path];
    return { field: path.length > 0 ? path.join('.') : null, message: issue.message };
  });
}

/**
 * Validates req.body / req.query / req.params with Zod schemas.
 * On success the parsed (trimmed, coerced, defaulted) values are available as
 * req.valid.body / req.valid.query / req.valid.params. Handlers must use req.valid,
 * never the raw request objects. On failure it responds 400 VALIDATION_ERROR.
 *
 *   router.post('/x', validate({ body: schema }), handler)
 */
export function validate(schemas) {
  return (req, res, next) => {
    const valid = {};
    const details = [];

    for (const location of ['params', 'query', 'body']) {
      const schema = schemas[location];
      if (!schema) continue;

      const input = location === 'body' ? (req.body ?? {}) : req[location];
      const result = schema.safeParse(input);
      if (result.success) {
        valid[location] = result.data;
      } else {
        details.push(...formatIssues(location, result.error));
      }
    }

    if (details.length > 0) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request data.', details));
    }

    req.valid = valid;
    return next();
  };
}
