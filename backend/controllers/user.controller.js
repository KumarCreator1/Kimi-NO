import { eq } from "drizzle-orm";
import db from "../db/connectDb.js";
import ms from "ms";
import { users } from "../models/Db.schema.js";
import { registerSchema, loginSchema } from "../validations/validations.js";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
} from "../services/user.services.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";

const registerUser = async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    const errorMessages = result.error.issues.map((err) => err.message);
    throw new AppError(400, errorMessages.join(", "));
  }

  const { firstName, lastName, email, password } = result.data;

  // const [userExists] = await db
  //   .select()
  //   .from(users)
  //   .where(eq(users.email, email))
  //   .limit(1);

  // if (userExists) {
  //   throw new AppError("User already exists", 400);
  // }

  const hashedPassword = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  if (!newUser) {
    throw new AppError(
      400,
      "A user with this email already exists please login",
    );
  }

  // user is successfully registered, NOW LOGIN the user AUTOMATICALLY and return the response
  const accessToken = generateAccessToken({
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
  });
  const refreshToken = generateRefreshToken({
    id: newUser.id,
    email: newUser.email,
  });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ms(process.env.ACCESS_TOKEN_EXPIRY), // Convert to milliseconds
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ms(process.env.REFRESH_TOKEN_EXPIRY), // Convert to milliseconds
  });

  const userData = {
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
  };

  return new ApiResponse(
    201,
    { user: userData },
    "User registered and logged in successfully",
  ).send(res);
};

const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user is populated by the verifyJWT middleware
  const userId = req.user.id;

  // Fetch the user from PostgreSQL
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const currentUser = result[0];

  if (!currentUser) {
    throw new AppError(404, "User not found");
  }

  // Security: Never send the password hash back to the React frontend
  const { password, ...userWithoutPassword } = currentUser;

  // The AuthContext expects response.data.user
  return new ApiResponse(
    200,
    { user: userWithoutPassword },
    "Current user fetched successfully",
  ).send(res);
});

const loginUser = async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    const errorMessages = result.error.issues.map((err) => err.message);
    throw new AppError(400, errorMessages.join(", "));
  }

  const { email, password } = result.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const isPasswordValid = user
    ? await comparePassword(password, user.password)
    : false;

  if (!user || !isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  // set the access token and refresh token in HttpOnly cookies
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
  });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ms(process.env.ACCESS_TOKEN_EXPIRY), // Convert to milliseconds
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ms(process.env.REFRESH_TOKEN_EXPIRY), // Convert to milliseconds
  });

  const userData = {
    id: user.id,
    email: user.email,
  };

  console.log(userData);

  return new ApiResponse(
    200,
    { user: userData },
    "User logged in successfully",
  ).send(res);
};

const logoutUser = async (req, res) => {
  // Clear the cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return new ApiResponse(200, null, "User logged out successfully").send(res);
};

const refreshAccessToken = async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new AppError(401, "Unauthorized request: no refresh token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (error) {
    throw new AppError(
      401,
      "Refresh token expired or invalid, please login again",
    );
  }

  // Re-check the DB instead of trusting the token payload — covers a user
  // refresh is the infrequent path where the extra query is worth it.
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, decoded.id))
    .limit(1);

  if (!user) {
    throw new AppError(401, "User no longer exists, please login again");
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
  });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ms(process.env.ACCESS_TOKEN_EXPIRY),
  });

  // NOTE: this does not rotate the refresh token or check it against a
  // stored/revoked list — because there's nothing in the DB to check yet.
  // Once refreshTokens is wired in, upgrade this to: look up the token by
  // hash, reject if revoked, issue + persist a new refresh token, revoke
  // the old one (rotation), and treat a reused old token as theft (revoke
  // the whole session family). None of that changes this endpoint's
  // shape — it's additions here, not a rewrite.

  return new ApiResponse(200, null, "Access token refreshed successfully").send(
    res,
  );
};

export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
};
