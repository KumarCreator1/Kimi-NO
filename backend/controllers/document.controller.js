import multer from "multer";
import db from "../db/connectDb.js";
import {
  documents,
  subjects,
  users,
  documentChunks,
} from "../models/Db.schema.js";
import { eq, and, isNull } from "drizzle-orm";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import {
  uploadBuffer,
  uploadRawForConversion,
  deleteByPublicId,
  getConvertedPdfIfReady,
  downloadBuffer,
} from "../services/cloudinary.service.js";
import { classifyUpload } from "../services/documentNormalization.service.js";
import { enrichDocumentFromFile } from "../services/llm.service.js";
import {
  createDocumentSchema,
  documentIdParamSchema,
} from "../validations/validations.js";

const processEnrichmentAsync = async (docId) => {
  try {
    let [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, docId))
      .limit(1);

    if (!doc) return;

    if (doc.mimeType.startsWith("image/")) {
      await db
        .update(documents)
        .set({ status: "ready", isAiEnriched: true })
        .where(eq(documents.id, docId));
      return;
    }

    const rawBuffer = await downloadBuffer(doc.filePath);
    const llm = await enrichDocumentFromFile({
      fileBuffer: rawBuffer,
      mimeType: doc.mimeType,
      fileName: doc.documentName,
    });

    await db.transaction(async (tx) => {
      await tx
        .update(documents)
        .set({
          aiTitle: llm.aiTitle,
          aiSummary: llm.aiSummary,
          topics: llm.topics,
          isAiEnriched: true,
          status: "ready",
          processingError: null,
        })
        .where(eq(documents.id, docId));

      if (Array.isArray(llm.chunks) && llm.chunks.length > 0) {
        const rows = llm.chunks.map((c) => ({
          documentId: docId,
          chunkIndex: c.index,
          content: c.content,
        }));
        await tx.insert(documentChunks).values(rows);
      }
    });
  } catch (err) {
    console.error("processEnrichmentAsync error:", err);
    await db
      .update(documents)
      .set({
        processingError: err.message ? err.message.slice(0, 500) : "AI Error",
        status: "failed",
      })
      .where(eq(documents.id, docId));
  }
};

const ALLOWED_UPLOAD_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_UPLOAD_MIMES.has(file.mimetype));
  },
});

// @desc  POST /api/v1/class/:classId/document
const uploadDocument = async (req, res) => {
  const file = req.file;
  if (!file) {
    throw new AppError(
      400,
      "No file uploaded (missing, oversized, or unsupported type)",
    );
  }

  const parsed = createDocumentSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { subjectId } = parsed.data;
  const classId = req.classId || req.params.classId;
  const uploadedBy = req.user.id;

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
    console.log("trying to hit cloudinary TRY BLock execution.....");

    const classified = classifyUpload({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
    console.log("classified:", classified);

    // ────────────────────────────────────────────────────────
    // PATH A: DOCX requires Async Aspose Conversion
    // ────────────────────────────────────────────────────────
    if (classified.kind === "needs_conversion") {
      console.log("conversion needed");

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
          filePath: raw.rawUrl,
          fileSize: null,
          mimeType: classified.mimeType,
          conversionPublicId: raw.publicId,
          status: "converting", // Frontend will poll checkConversionStatus
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

    // ────────────────────────────────────────────────────────
    // PATH B: PDF/Image is already good to go
    // ────────────────────────────────────────────────────────
    uploadRes = await uploadBuffer(
      classified.buffer,
      classified.fileName,
      classified.mimeType,
    );

    console.log("no conversion needed UPLOADres:", uploadRes);

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
        status: "converted", // <-- CHANGED: Skips "converting" phase entirely, jumps to converted (AI Enrichment phase)
      })
      .returning();

    if (!newDoc) {
      await deleteByPublicId(uploadRes.publicId, uploadedResourceType);
      throw new AppError(500, "Failed to persist document metadata");
    }

    processEnrichmentAsync(newDoc.id).catch((err) =>
      console.error("Async enrichment failed:", err),
    );

    return new ApiResponse(
      202,
      { document: newDoc },
      "Document uploaded, AI processing started",
    ).send(res);
  } catch (error) {
    //Rollback the Cloudinary upload if DB insert fails
    if (uploadRes?.publicId) {
      await deleteByPublicId(uploadRes.publicId, uploadedResourceType).catch(
        (cleanupErr) => console.error("Cloudinary cleanup failed:", cleanupErr),
      );
    }
    throw error;
  }
};

// @desc  GET /api/v1/class/:classId/document/:documentId/conversion-status
// Automated polling route to check if Aspose is done with a DOCX
const checkConversionStatus = async (req, res) => {
  const { classId, documentId } = req.params;

  let [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.classId, classId)))
    .limit(1);

  if (!doc) throw new AppError(404, "Document not found");

  // If it's already converted/ready/failed, tell frontend to stop polling
  if (doc.status !== "converting") {
    return new ApiResponse(
      200,
      { document: doc },
      "Conversion phase complete",
    ).send(res);
  }

  // Safety Check: Has Aspose been stuck for more than 5 minutes?
  const docAgeMinutes =
    (Date.now() - new Date(doc.createdAt).getTime()) / 60000;
  if (docAgeMinutes > 5) {
    await db
      .update(documents)
      .set({
        status: "failed",
        processingError: "Document conversion timed out. File may be corrupt.",
      })
      .where(eq(documents.id, doc.id));

    throw new AppError(422, "Conversion failed due to timeout.");
  }

  // Check Cloudinary Aspose status
  const converted = await getConvertedPdfIfReady(doc.conversionPublicId);

  if (!converted) {
    // Return 202 so frontend knows to keep polling
    return res.status(202).json({
      status: "converting",
      message: "Still converting to PDF.",
    });
  }

  // Conversion finished!
  const [updatedDoc] = await db
    .update(documents)
    .set({
      filePath: converted.url,
      fileSize: converted.bytes,
      mimeType: "application/pdf",
      status: "converted", // <-- Ready for AI Enrichment
      processingError: null,
    })
    .where(eq(documents.id, doc.id))
    .returning();

  // Cleanup: Delete the raw DOCX from Cloudinary to save storage space
  await deleteByPublicId(doc.conversionPublicId, "raw").catch(() => {});

  processEnrichmentAsync(updatedDoc.id).catch((err) =>
    console.error("Async enrichment failed:", err),
  );

  return new ApiResponse(
    200,
    { document: updatedDoc },
    "Conversion complete, AI processing started",
  ).send(res);
};

// @desc  POST /api/v1/class/:classId/document/:documentId/enrich
// Manual trigger route for Gemini AI
const enrichDocument = async (req, res) => {
  console.log("enrichDocument called");
  const { classId, documentId } = req.params;

  let [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.classId, classId)))
    .limit(1);

  if (!doc) throw new AppError(404, "Document not found");

  if (doc.isAiEnriched) {
    return new ApiResponse(
      200,
      { document: doc },
      "Document is already enriched",
    ).send(res);
  }

  if (doc.status === "converting" || doc.status === "converted") {
    throw new AppError(
      400,
      "Cannot enrich. Document is currently converting or processing.",
    );
  }

  // Set status to 'converted' so UI shows processing, then kick off async task!
  await db
    .update(documents)
    .set({
      status: "converted",
      processingError: null,
    })
    .where(eq(documents.id, doc.id));

  // Run async without awaiting
  processEnrichmentAsync(doc.id).catch((err) =>
    console.error("Manual async enrichment failed:", err),
  );

  return new ApiResponse(202, null, "AI Enrichment started in background").send(
    res,
  );
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
      // User can view the PDF as long as it's not still converting
      canViewInApp: doc.status === "ready" || doc.status === "converted",
      canDownload: doc.status !== "converting",
      downloadedHintKey: `doc:${doc.id}`,
    },
    "Document view data fetched",
  ).send(res);
};

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
  checkConversionStatus,
  enrichDocument,
  getDocument,
  listDocuments,
  getDocumentViewData,
  downloadDocument,
};
