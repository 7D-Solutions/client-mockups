/**
 * ValidationError
 *
 * Custom error class for business rule validation failures.
 * These are client errors (4xx) not server errors (5xx).
 *
 * Examples:
 * - Gauge is part of a set
 * - Gauge is already checked out
 * - Sealed gauges require approval
 * - Overdue calibration
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400; // Bad Request

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

module.exports = ValidationError;
