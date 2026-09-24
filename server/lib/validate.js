// server/lib/validate.js – Zod validation middleware for request payloads.
import { ApiError } from './errors.js';

/**
 * Validates req[source] against `schema` on success replaces it with the
 * parsed (coerced/trimmed) value; on failure rejects with VALIDATION_ERROR.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.') || source,
        message: issue.message,
      }));
      const first = issues[0];
      const message = first
        ? `${first.path}: ${first.message}`
        : 'Invalid request';
      return next(ApiError.validation(message, issues));
    }
    req[source] = result.data;
    next();
  };
}
