import { eq } from 'drizzle-orm';
import db from '../db/connectDb.js';
import { users } from '../models/Db.schema.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/apiResponse.js';
import AppError from '../utils/appError.js';

const registerUser = async (req, res) => {

    const { fullName, email, password } = req.body;
  
    const [userExists] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
  
    if (userExists) {
      throw new AppError('User already exists', 400);
    }
  
    const [newUser] = await db
      .insert(users)
      .values({
        fullName,
        email,
        password, 
      })
      .returning();
  
    if (!newUser) {
      throw new AppError('Invalid user data received', 400);
    }
  
    const userData = {
      id: newUser.id, 
      fullName: newUser.fullName,
      email: newUser.email,
    };
  
    return new ApiResponse(201, userData, 'User registered successfully').send(res);
  
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || user.password !== password) {
    throw new AppError('Invalid email or password', 401);
  }

  const userData = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
  };

  return new ApiResponse(200, userData, 'User logged in successfully').send(res);
};

export { registerUser, loginUser };

export { registerUser };