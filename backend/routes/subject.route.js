import express from "express";
import checkClassRole from "../middlewares/classRole.middleware.js";
import {
  createSubject,
  listSubjects,
  getSubjectDetail,
  updateSubject,
  deleteSubject,
} from "../controllers/subject.controller.js";
import documentRoute from "./document.route.js"; // Inherits document routing

// mergeParams to access :classId from parent route[cite: 3]
const router = express.Router({ mergeParams: true });

// create a subject — any member
// @desc  POST   /api/v1/class/:classId/subject
router.post("/", checkClassRole(), createSubject);

// list subjects in class — any member[cite: 3]
// @desc  GET    /api/v1/class/:classId/subject
router.get("/", checkClassRole(), listSubjects);

// @desc  GET    /api/v1/class/:classId/subject/:subjectId get subject detail — any member[cite: 3]
router.get("/:subjectId", checkClassRole(), getSubjectDetail);

// @desc  PATCH  /api/v1/class/:classId/subject/:subjectId update subject — admin only[cite: 3]
router.patch("/:subjectId", checkClassRole("admin"), updateSubject);

// @desc  DELETE /api/v1/class/:classId/subject/:subjectId delete subject — admin only[cite: 3]
router.delete("/:subjectId", checkClassRole("admin"), deleteSubject);

// Mount document routes under the specific subject to enforce class->subject->document hierarchy
router.use("/:subjectId/document", documentRoute);

export default router;
