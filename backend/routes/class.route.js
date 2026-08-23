import express from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import checkClassRole from "../middlewares/classRole.middleware.js";
import {
  createClass,
  getUserClasses,
  getClassDetail,
  updateClass,
  deleteClass,
  addClassMember,
  removeClassMember,
} from "../controllers/class.controller.js";

const router = express.Router();

router.use(verifyJWT); // every class route requires login

// @desc  POST   /api/v1/class            create a class (creator becomes admin)
router.post("/", createClass);

// @desc  GET    /api/v1/class            list classes the user belongs to
router.get("/", getUserClasses);

// @desc  GET    /api/v1/class/:classId   class detail — any member
router.get("/:classId", checkClassRole(), getClassDetail);

// @desc  PATCH  /api/v1/class/:classId   update class — admin only
router.patch("/:classId", checkClassRole("admin"), updateClass);

// @desc  DELETE /api/v1/class/:classId   delete class — admin only
router.delete("/:classId", checkClassRole("admin"), deleteClass);

// @desc  POST   /api/v1/class/:classId/member            add member — admin only
router.post("/:classId/member", checkClassRole("admin"), addClassMember);

// @desc  DELETE /api/v1/class/:classId/member/:memberId  remove member — admin only
router.delete(
  "/:classId/member/:memberId",
  checkClassRole("admin"),
  removeClassMember,
);

export default router;
