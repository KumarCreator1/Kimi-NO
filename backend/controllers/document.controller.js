import multer from "multer";
import db from "../db/connectDb.js";
import { documents, subjects, users } from "../models/Db.schema.js";
import { eq, and, isNull } from "drizzle-orm";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import {
  uploadBuffer,
  deleteByPublicId,
} from "../services/cloudinary.service.js";
import { normalizeUploadToCanonicalFile } from "../services/documentNormalization.service.js";
import {
  createDocumentSchema,
  documentIdParamSchema,
} from "../validations/validations.js";

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/v1/class/:classId/document
const uploadDocument = async (req, res) => {
  // multer handled file in req.file
  const file = req.file;
  if (!file) {
    throw new AppError(400, "No file uploaded");
  }

  // validate body (subjectId)
  const parsed = createDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { subjectId } = parsed.data;
  const classId = req.classId || req.params.classId; // checkClassRole attaches classId
  const uploadedBy = req.user.id;
  let uploadRes;

  try {
    const normalized = await normalizeUploadToCanonicalFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    // 1) Upload to Cloudinary
    uploadRes = await uploadBuffer(
      normalized.buffer,
      normalized.fileName,
      normalized.mimeType,
    );

    // 2) Insert document row with status 'processing'
    const [newDoc] = await db
      .insert(documents)
      .values({
        classId,
        subjectId,
        uploadedBy,
        documentName: normalized.fileName,
        filePath: uploadRes.url,
        fileSize: uploadRes.bytes,
        mimeType: normalized.mimeType,
        status: "processing",
      })
      .returning();

    if (!newDoc) {
      await deleteByPublicId(uploadRes.publicId);
      throw new AppError(500, "Failed to persist document metadata");
    }

    // worker will enrich this later
    return new ApiResponse(
      202,
      { document: newDoc },
      "Document uploaded, processing",
    ).send(res);
  } catch (error) {
    if (uploadRes?.publicId) {
      await deleteByPublicId(uploadRes.publicId);
    }
    throw new AppError(500, "Failed to upload document");
  }
};

const getDocument = async (req, res) => {
  const parsed = documentIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId, documentId } = parsed.data;

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.classId, classId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);
  if (!doc) throw new AppError(404, "Document not found");

  return new ApiResponse(200, { document: doc }, "Document fetched").send(res);
};

const listDocuments = async (req, res) => {
  const { classId } = req;
  const { subjectId } = req.query;

  const filters = [eq(documents.classId, classId), isNull(documents.deletedAt)];
  if (subjectId) filters.push(eq(documents.subjectId, subjectId));

  const rows = await db
    .select()
    .from(documents)
    .where(and(...filters))
    .orderBy(documents.createdAt);

  return new ApiResponse(200, { documents: rows }, "Documents fetched").send(
    res,
  );
};

const getDocumentViewData = async (req, res) => {
  const parsed = documentIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId, documentId } = parsed.data;

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.classId, classId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  if (!doc) throw new AppError(404, "Document not found");

  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, doc.subjectId))
    .limit(1);

  const [uploader] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, doc.uploadedBy))
    .limit(1);

  return new ApiResponse(
    200,
    {
      document: doc,
      subject,
      uploader,
      canViewInApp: true,
      canDownload: true,
      downloadedHintKey: `doc:${doc.id}`,
    },
    "Document view data fetched",
  ).send(res);
};

// Return the Cloudinary URL (signed handling is left to Cloudinary config)
const downloadDocument = async (req, res) => {
  const parsed = documentIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId, documentId } = parsed.data;

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.classId, classId),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);
  if (!doc) throw new AppError(404, "Document not found");

  return new ApiResponse(200, { url: doc.filePath }, "Signed URL").send(res);
};

export {
  upload,
  uploadDocument,
  getDocument,
  listDocuments,
  getDocumentViewData,
  downloadDocument,
};
