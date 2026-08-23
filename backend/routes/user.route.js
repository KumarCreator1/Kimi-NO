import express from "express";
// import asyncHandler from "../utils/asyncHandler.js";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// @desc    POST /api/v1/user/register
router.post("/register", registerUser);

//@desc    POST /api/v1/user/login
router.post("/login", loginUser);

//@desc    GET /api/v1/user/logout
router.post("/logout", logoutUser);

// @desc    POST /api/v1/user/refresh — reads the refreshToken cookie,
router.post("/refresh", refreshAccessToken);

//@desc    GET /api/v1/user/me
router.get("/me", verifyJWT, getCurrentUser); // Protected route to get user profile

export default router;
