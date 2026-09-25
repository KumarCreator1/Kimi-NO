import express from "express";
import checkClassRole from "../middlewares/classRole.middleware.js";
import {
  createDocument,
  getDocumentsBySubject,
  syncDocumentStatus,
  deleteDocument,
} from "../controllers/document.controller.js";

// mergeParams to access :classId and :subjectId from parent routes
const router = express.Router({ mergeParams: true });

// @desc  POST   /api/v1/class/:classId/subject/:subjectId/document
// Uploads document to database and starts AI processing
router.post("/", checkClassRole(), createDocument);

// @desc  GET    /api/v1/class/:classId/subject/:subjectId/document
// List documents in a subject
router.get("/", checkClassRole(), getDocumentsBySubject);

// @desc  GET    /api/v1/class/:classId/subject/:subjectId/document/:documentId/sync
// Manually fetch status of a document (Crash recovery capable)
router.get("/:documentId/sync", checkClassRole(), syncDocumentStatus);

// @desc  DELETE /api/v1/class/:classId/subject/:subjectId/document/:documentId
// Delete document — admin only
router.delete("/:documentId", checkClassRole("admin"), deleteDocument);

export default router;
