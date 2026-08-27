import multer from "multer";
import db from "../db/connectDb.js";
import { documents, subjects, users } from "../models/Db.schema.js";
import { eq, and, isNull } from "drizzle-orm";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import {
  uploadBuffer,
  uploadRawForConversion,
  deleteByPublicId,
} from "../services/cloudinary.service.js";
import { classifyUpload } from "../services/documentNormalization.service.js";
import {
  createDocumentSchema,
  documentIdParamSchema,
} from "../validations/validations.js";

const ALLOWED_UPLOAD_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB — adjust to your real cap
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_UPLOAD_MIMES.has(file.mimetype));
  },
});

// POST /api/v1/class/:classId/document
const uploadDocument = async (req, res) => {
  // multer handled file in req.file
  const file = req.file;
  if (!file) {
    throw new AppError(
      400,
      "No file uploaded (missing, oversized, or unsupported type)",
    );
  }

  // validate body (subjectId)
  const parsed = createDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { subjectId } = parsed.data;
  const classId = req.classId || req.params.classId; // checkClassRole attaches classId
  const uploadedBy = req.user.id;

  // subjectId must actually belong to classId — otherwise a member of one
  // class could file a document under a subject from a class they have no
  // access to, and the classId-sync trigger would "correct" it silently.
  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.classId, classId)))
    .limit(1);
  if (!subject) {
    throw new AppError(400, "Subject does not belong to this class");
  }

  let uploadRes;
  let uploadedResourceType = "auto";

  try {
    const classified = classifyUpload({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    if (classified.kind === "needs_conversion") {
      // DOCX/DOC path: upload raw to Cloudinary, mark "converting", and let
      // conversion.worker.js poll Cloudinary's Aspose add-on until the PDF
      // exists. It will flip status -> "processing" once ready, which is
      // what enrichment.worker.js watches for.
      uploadedResourceType = "raw";
      const raw = await uploadRawForConversion(
        classified.buffer,
        classified.fileName,
        classified.mimeType,
      );
      uploadRes = { publicId: raw.publicId };

      const [newDoc] = await db
        .insert(documents)
        .values({
          classId,
          subjectId,
          uploadedBy,
          documentName: classified.fileName,
          filePath: raw.rawUrl, // raw DOCX url for now; poller overwrites with the PDF url
          fileSize: null, // unknown until conversion completes
          mimeType: classified.mimeType, // still the original docx mime for now
          conversionPublicId: raw.publicId,
          status: "converting",
        })
        .returning();

      if (!newDoc) {
        await deleteByPublicId(uploadRes.publicId, "raw");
        throw new AppError(500, "Failed to persist document metadata");
      }

      return new ApiResponse(
        202,
        { document: newDoc },
        "Document uploaded, converting",
      ).send(res);
    }

    // PDF / image path: unchanged synchronous flow, straight to "processing"
    uploadRes = await uploadBuffer(
      classified.buffer,
      classified.fileName,
      classified.mimeType,
    );

    const [newDoc] = await db
      .insert(documents)
      .values({
        classId,
        subjectId,
        uploadedBy,
        documentName: classified.fileName,
        filePath: uploadRes.url,
        fileSize: uploadRes.bytes,
        mimeType: classified.mimeType,
        status: "processing",
      })
      .returning();

    if (!newDoc) {
      await deleteByPublicId(uploadRes.publicId, uploadedResourceType);
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
      await deleteByPublicId(uploadRes.publicId, uploadedResourceType).catch(
        () => {},
      );
    }
    if (error instanceof AppError) throw error;
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

  const uploader = doc.uploadedBy
    ? ((
        await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, doc.uploadedBy))
          .limit(1)
      )[0] ?? null)
    : null;

  return new ApiResponse(
    200,
    {
      document: doc,
      subject,
      uploader,
      canViewInApp: doc.status === "ready" || doc.status === "processing",
      canDownload: doc.status !== "converting",
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

  if (doc.status === "converting") {
    throw new AppError(409, "Document is still being converted");
  }

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
