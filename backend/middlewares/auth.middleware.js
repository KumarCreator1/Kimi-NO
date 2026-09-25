import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/appError.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // Look for the token in the cookies (or fallback to the Authorization header)
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new AppError(401, "Unauthorized request: No token provided");
  }

  try {
    // Verify the token using your secret
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Attach the user's decoded payload (like their ID) to the request object
    req.user = decodedToken;
    next();
  } catch (error) {
    throw new AppError(401, "Unauthorized request: Invalid token");
  }
});
