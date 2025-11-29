/**
 * DomainValidationError
 *
 * Custom error class for domain-level validation failures.
 * Provides structured error information with error codes and metadata.
 *
 * Reference: ADR-001 (Adopt Domain-Driven Design)
 */

class DomainValidationError extends Error {
  constructor(message, code, metadata = {}) {
    super(message);
    this.name = 'DomainValidationError';
    this.code = code;
    this.metadata = metadata;

    // Maintains proper stack trace for where error was thrown (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainValidationError);
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      metadata: this.metadata
    };
  }
}

module.exports = DomainValidationError;
