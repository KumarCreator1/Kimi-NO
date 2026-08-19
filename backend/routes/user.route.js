import express from "express";
// import asyncHandler from "../utils/asyncHandler.js";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { desc } from "drizzle-orm";

const router = express.Router();
// @desc    POST /api/v1/user/register
router.post("/register", registerUser);

//@desc    POST /api/v1/user/login
router.post("/login", loginUser);

//@desc    GET /api/v1/user/logout
router.post("/logout", logoutUser);

//@desc    GET /api/v1/user/me
router.get("/me", verifyJWT, getCurrentUser); // Protected route to get user profile

// @desc    POST /api/v1/user/login
// router.post('/login', loginUser)
// router.get('/profile', getUserProfile)

export default router;
