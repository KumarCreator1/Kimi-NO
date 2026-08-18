import { eq } from "drizzle-orm";
import db from "../db/connectDb.js";
import { users } from "../models/Db.schema.js";
import { registerSchema } from "../validations/validations.js";
import { hashPassword, comparePassword,generateAccessToken,generateRefreshToken } from "../services/user.services.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";

const registerUser = async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    const errorMessages = result.error.issues.map((err) => err.message);
    throw new AppError(errorMessages.join(", "), 400);
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
    .onConflictDoNothing({target: users.email})
    .returning();

  if (!newUser) {
    throw new AppError("A user with this email already exists please login", 400);
  }

// user is successfully registered, NOW LOGIN the user AUTOMATICALLY and return the response
  const accessToken = generateAccessToken({ id: newUser.id, email: newUser.email, firstName: newUser.firstName});
  const refreshToken = generateRefreshToken({ id: newUser.id, email: newUser.email });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRY) * 1000, // Convert to milliseconds
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: parseInt(process.env.REFRESH_TOKEN_EXPIRY) * 1000, // Convert to milliseconds
  });


  const userData = {
    id: newUser.id,
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
  };

  return new ApiResponse(201, userData, "User registered and logged in successfully").send(
    res,
  );
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || user.password !== password) {
    throw new AppError("Invalid email or password", 401);
  }

  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
  };

  return new ApiResponse(200, userData, "User logged in successfully").send(
    res,
  );
};

export { registerUser, loginUser };