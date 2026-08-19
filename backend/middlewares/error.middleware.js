// middlewares/error.middleware.js

const errorMiddleware = (err, req, res, next) => {
  // If the error doesn't have a status code (like a random Node crash), default to 500
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: err.success || false,
    message: err.message || "Internal Server Error",
    // Hide the stack trace when in production mode for security
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorMiddleware;
