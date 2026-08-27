import express from "express";
import checkClassRole from "../middlewares/classRole.middleware.js";
import {
  createSubject,
  listSubjects,
  getSubjectDetail,
  updateSubject,
  deleteSubject,
} from "../controllers/subject.controller.js";

const router = express.Router({ mergeParams: true }); // mergeParams to access :classId from parent route

// @desc  POST   /api/v1/class/:classId/subject           create a subject — any member
router.post("/", checkClassRole(), createSubject);

// @desc  GET    /api/v1/class/:classId/subject           list subjects in class — any member
router.get("/", checkClassRole(), listSubjects);

// @desc  GET    /api/v1/class/:classId/subject/:subjectId get subject detail — any member
router.get("/:subjectId", checkClassRole(), getSubjectDetail);

// @desc  PATCH  /api/v1/class/:classId/subject/:subjectId update subject — admin only
router.patch("/:subjectId", checkClassRole("admin"), updateSubject);

// @desc  DELETE /api/v1/class/:classId/subject/:subjectId delete subject — admin only
router.delete("/:subjectId", checkClassRole("admin"), deleteSubject);

// This router is mounted under class.route.js not in index.js, so it inherits the /api/v1/class/:classId prefix from there.
// by mergeParams: true, we can access :classId in req.params in this router's handlers.
export default router;
