import { eq } from "drizzle-orm";
import db from "../db/connectDb.js";
import ms from "ms";
import { users } from "../models/Db.schema.js";
import { registerSchema } from "../validations/validations.js";
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
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: userWithoutPassword },
        "Current user fetched successfully",
      ),
    );
});

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || comparePassword(password, user.password) === false) {
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
    fullName: user.fullName,
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

export { registerUser, loginUser, logoutUser, getCurrentUser };
