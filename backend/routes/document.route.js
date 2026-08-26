import express from "express";
import checkClassRole from "../middlewares/classRole.middleware.js";
import {
  upload,
  uploadDocument,
  getDocument,
  listDocuments,
  getDocumentViewData,
  downloadDocument,
} from "../controllers/document.controller.js";

const router = express.Router({ mergeParams: true });

// All document routes require class membership
router.post("/", checkClassRole(), upload.single("file"), uploadDocument);
router.get("/", checkClassRole(), listDocuments);
router.get("/:documentId", checkClassRole(), getDocument);
router.get("/:documentId/view", checkClassRole(), getDocumentViewData);
router.get("/:documentId/download", checkClassRole(), downloadDocument);

export default router;
