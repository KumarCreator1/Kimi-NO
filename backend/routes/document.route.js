import express from "express";
import checkClassRole from "../middlewares/classRole.middleware.js";
import {
  upload,
  uploadDocument,
  getDocument,
  listDocuments,
  getDocumentViewData,
  downloadDocument,
  checkConversionStatus,
  enrichDocument,
} from "../controllers/document.controller.js";

const router = express.Router({ mergeParams: true });

// All document routes require class membership[cite: 2]
// @desc  POST /api/v1/class/:classId/subject/:subjectId/document
router.post("/", checkClassRole(), upload.single("file"), uploadDocument);

// @desc  GET /api/v1/class/:classId/subject/:subjectId/document
router.get("/", checkClassRole(), listDocuments);

// @desc  GET /api/v1/class/:classId/subject/:subjectId/document/:documentId
router.get("/:documentId", checkClassRole(), getDocument);

// @desc  GET /api/v1/class/:classId/subject/:subjectId/document/:documentId/view
router.get("/:documentId/view", checkClassRole(), getDocumentViewData);

// @desc  GET /api/v1/class/:classId/subject/:subjectId/document/:documentId/download
router.get("/:documentId/download", checkClassRole(), downloadDocument);

// Frontend polls this automatically in the background if a DOCX was uploaded[cite: 2]
// @desc  GET /api/v1/class/:classId/subject/:subjectId/document/:documentId/conversion-status
router.get(
  "/:documentId/conversion-status",
  checkClassRole(),
  checkConversionStatus,
);

// Manual trigger tied to the "Enrich AI" button on the frontend[cite: 2]
// @desc  POST /api/v1/class/:classId/subject/:subjectId/document/:documentId/enrich
router.post("/:documentId/enrich", checkClassRole(), enrichDocument);

export default router;
