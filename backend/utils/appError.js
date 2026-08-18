/**
 * @description Custom Error Class to handle operational/HTTP errors cleanly
 */
class AppError extends Error {
  /**
   * @param {string} message - The error message explanation
   * @param {number} statusCode - The HTTP status code (e.g., 400, 401, 404)
   */
  constructor(message, statusCode) {
    // Pass the error message to the parent built-in Error class
    super(message);

    this.statusCode = statusCode;

    // Automatically determines if the error is operational (expected) vs a systemic bug
    this.success = false;

    // Captures the system line-by-line file stack trace, excluding this constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
