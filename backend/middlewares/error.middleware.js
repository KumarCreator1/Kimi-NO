// middlewares/error.middleware.js

const errorMiddleware = (err, req, res, next) => {
  // Prevent double-sending if response was already committed
  if (res.headersSent) {
    return next(err);
  }

  if (err?.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large"
        : err.message || "Invalid file upload";

    return res.status(400).json({
      success: false,
      message,
      stack: process.env.NODE_ENV === "production" ? null : err?.stack,
    });
  }

  if (err?.name === "ZodError") {
    return res.status(400).json({
      success: false,
      message: err.issues?.map((i) => i.message).join(", ") || "Validation error",
      stack: process.env.NODE_ENV === "production" ? null : err?.stack,
    });
  }

  if (err?.code === "23505") {
    return res.status(400).json({
      success: false,
      message: "A record with that value already exists",
      stack: process.env.NODE_ENV === "production" ? null : err?.stack,
    });
  }

  if (err?.code === "22P02") {
    return res.status(400).json({
      success: false,
      message: "Invalid UUID format in database query",
      stack: process.env.NODE_ENV === "production" ? null : err?.stack,
    });
  }

  // If the error doesn't have a status code (like a random Node crash), default to 500
  const statusCode = err?.statusCode || 500;

  res.status(statusCode).json({
    success: err?.success || false,
    message: err?.message || "Internal Server Error",
    // Hide the stack trace when in production mode for security
    stack: process.env.NODE_ENV === "production" ? null : err?.stack,
  });
};

export default errorMiddleware;
