import express from "express";
// import asyncHandler from "../utils/asyncHandler.js";
import { registerUser } from "../controllers/user.controller.js";

const router = express.Router();
// @desc    POST /api/v1/user/register
router.post("/register", registerUser);
// router.post('/login', loginUser)
// router.get('/profile', getUserProfile)

export default router;
