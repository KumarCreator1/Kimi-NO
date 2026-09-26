import "dotenv/config";
import { eq, and, isNull, desc } from "drizzle-orm";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import os from "os";
import { GoogleGenAI } from "@google/genai";

import db from "../db/connectDb.js";
import { documents, subjects } from "../models/Db.schema.js";
import {
  createDocumentSchema,
  documentIdParamSchema,
  subjectIdParamSchema,
} from "../validations/validations.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Utility to download a file stream directly to disk (Bypasses RAM, supports HTTP/HTTPS, redirects)
const downloadFileToDisk = async (url, dest) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const fileStream = fs.createWriteStream(dest);
  try {
    await pipeline(Readable.fromWeb(response.body), fileStream);
  } catch (err) {
    if (fs.existsSync(dest)) {
      try {
        fs.unlinkSync(dest);
      } catch (_) {}
    }
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Retry helper — exponential backoff, only for transient Gemini quota errors
// ─────────────────────────────────────────────────────────────────────────────

// HTTP statuses that Gemini returns when temporarily overloaded / rate-limited
const RETRYABLE_STATUSES = new Set([429, 500, 503]);

/**
 * Retries an async fn up to maxAttempts with exponential backoff.
 * Only retries on transient errors (429, 503, "overloaded" messages).
 * Hard errors (404 wrong model, 400 bad request, bad API key) fail immediately.
 *
 * @param {Function} fn          - Async function to attempt
 * @param {number}   maxAttempts - Max number of tries (default 3)
 * @param {number}   baseDelayMs - Starting delay in ms, doubles each retry (default 5s)
 */
const retryWithBackoff = async (fn, maxAttempts = 3, baseDelayMs = 5000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Detect HTTP status from Gemini SDK error shape
      const httpStatus = err?.status ?? err?.response?.status;
      const isRetryable =
        RETRYABLE_STATUSES.has(httpStatus) ||
        /too many requests|rate.?limit|overloaded|try again|quota/i.test(
          err?.message || "",
        );

      if (!isRetryable || attempt === maxAttempts) {
        // Hard error (404, 400, bad key) or exhausted attempts — surface immediately
        throw err;
      }

      // Exponential backoff: 5s → 10s → 20s
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `[Retry] Attempt ${attempt}/${maxAttempts} failed (HTTP ${httpStatus ?? "unknown"}). Retrying in ${delayMs / 1000}s...`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError;
};

// Background AI Processing Task (Zero-Flicker Architecture)
const processDocumentInBackground = async (documentId, fileUrl, mimeType) => {
  const tmpFilePath = path.join(os.tmpdir(), `document_${documentId}.pdf`);
  let uploadedFileUri = null;
  let ai = null;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    ai = new GoogleGenAI({ apiKey });

    // 1. Download to /tmp (Low Memory, streaming)
    console.log(`[Job ${documentId}] Downloading file to disk...`);
    await downloadFileToDisk(fileUrl, tmpFilePath);

    // 2. Upload to Gemini File API
    console.log(`[Job ${documentId}] Uploading to Gemini File API...`);
    const uploadResult = await ai.files.upload({
      file: tmpFilePath,
      mimeType: mimeType || "application/pdf",
    });
    uploadedFileUri = uploadResult.name; // resource name — used only for ai.files.delete()
    const uploadedFileGlobalUri = uploadResult.uri; // full https:// URI — used in generateContent
    console.log(`[Job ${documentId}] Uploaded successfully as ${uploadedFileUri}`);

    // 3. Call LLM to extract JSON structure
    console.log(`[Job ${documentId}] Asking Gemini to extract insights...`);
    const prompt = `
      You are an expert educational AI. Read this document and extract key insights.
      Provide the response strictly in JSON format matching this schema:
      {
        "aiTitle": "A concise, clear, and professional title for this document",
        "aiSummary": "A detailed 2-3 paragraph summary of the document's core concepts",
        "topics": ["Array of", "3 to 6", "broad topic strings", "e.g., Physics", "Quantum Mechanics"],
        "hashtags": ["Array of", "3 to 6", "hashtags", "e.g., #Physics", "#StudyNotes"]
      }
    `;


    // Retry only the LLM call — file upload already succeeded at this point
    const response = await retryWithBackoff(
      () =>
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            {
              fileData: {
                // Must be the full https:// URI, NOT the short resource name
                fileUri: uploadedFileGlobalUri,
                mimeType: uploadResult.mimeType,
              },
            },
            { text: prompt },
          ],
          config: {
            responseMimeType: "application/json",
          },
        }),
      3,    // up to 3 attempts
      3000, // start at 3s → 3s, 6s, 12s
    );


    // Clean JSON fences if present
    let rawText = response.text?.trim() || "{}";
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    const aiData = JSON.parse(rawText);

    // 4. Update Database to Ready!
    console.log(`[Job ${documentId}] AI processing complete. Updating database...`);
    await db
      .update(documents)
      .set({
        status: "ready",
        aiTitle: aiData.aiTitle || null,
        aiSummary: aiData.aiSummary || null,
        topics: Array.isArray(aiData.topics) ? aiData.topics : [],
        isAiEnriched: true,
        lockedAt: null,
      })
      .where(eq(documents.id, documentId));

  } catch (error) {
    console.error(`[Job ${documentId}] Background processing failed:`, error);
    
    // Mark as failed in DB
    try {
      await db
        .update(documents)
        .set({
          status: "failed",
          processingError: error.message,
          lockedAt: null,
        })
        .where(eq(documents.id, documentId));
    } catch (dbError) {
      console.error(`[Job ${documentId}] Failed to update DB to 'failed' status:`, dbError);
    }
  } finally {
    // 5. Hard Cleanup (Important to prevent memory/storage leaks)
    if (fs.existsSync(tmpFilePath)) {
      try {
        fs.unlinkSync(tmpFilePath);
        console.log(`[Job ${documentId}] Deleted local /tmp file.`);
      } catch (cleanupErr) {
        console.error(`[Job ${documentId}] Error deleting local /tmp file:`, cleanupErr);
      }
    }

    if (uploadedFileUri && ai) {
      try {
        await ai.files.delete({ name: uploadedFileUri });
        console.log(`[Job ${documentId}] Deleted Google Cloud file.`);
      } catch (err) {
        console.error(`[Job ${documentId}] Error deleting Google Cloud file:`, err);
      }
    }
  }
};

// -------------------------------------------------------------
// Controller Endpoints
// -------------------------------------------------------------

// POST /api/v1/class/:classId/subject/:subjectId/document
// Direct-to-Cloud architecture: Frontend uploads to Cloudinary and sends us the URL.
export const createDocument = asyncHandler(async (req, res) => {
  const dataToValidate = {
    ...req.body,
    classId: req.params.classId,
    subjectId: req.params.subjectId || req.body.subjectId,
  };
  
  const parsed = createDocumentSchema.safeParse(dataToValidate);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId } = req; // From checkClassRole middleware
  const { subjectId, documentName, filePath, fileSize, mimeType } = parsed.data;

  // Verify that the subject belongs to this class
  const [subject] = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.classId, classId)));

  if (!subject) {
    throw new AppError(404, "Subject not found in this class");
  }

  // Insert document in "converting" state instantly
  const [newDocument] = await db
    .insert(documents)
    .values({
      classId,
      subjectId,
      uploadedBy: req.user.id,
      documentName,
      filePath,
      fileSize,
      mimeType,
      status: "converting",
      lockedAt: new Date(),
    })
    .returning();

  // Kick off the background process WITHOUT awaiting it (Frees Vercel 15s timeout)
  processDocumentInBackground(newDocument.id, newDocument.filePath, newDocument.mimeType);

  return new ApiResponse(
    201,
    { document: newDocument },
    "Document uploaded. AI Processing started in background."
  ).send(res);
});

// GET /api/v1/class/:classId/subject/:subjectId/document
export const getDocumentsBySubject = asyncHandler(async (req, res) => {
  const parsed = subjectIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId, subjectId } = parsed.data;

  // Verify that the subject belongs to this class
  const [subject] = await db
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.classId, classId)));

  if (!subject) {
    throw new AppError(404, "Subject not found in this class");
  }

  const docs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.subjectId, subjectId),
        eq(documents.classId, classId),
        isNull(documents.deletedAt)
      )
    )
    .orderBy(desc(documents.createdAt));

  return new ApiResponse(200, { documents: docs }, "Documents fetched").send(res);
});

// GET /api/v1/class/:classId/subject/:subjectId/document/:documentId/sync
// Re-claims orphaned tasks if server crashed during processing
export const syncDocumentStatus = asyncHandler(async (req, res) => {
  const parsed = documentIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId, documentId } = parsed.data;
  const subjectId = req.params.subjectId;

  let [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.classId, classId),
        subjectId ? eq(documents.subjectId, subjectId) : undefined,
        isNull(documents.deletedAt)
      )
    )
    .limit(1);

  if (!doc) {
    throw new AppError(404, "Document not found");
  }

  // Crash Recovery Logic: If stuck in converting for > 5 minutes, mark as failed.
  if (doc.status === "converting" && doc.lockedAt) {
    const minutesSinceLocked = (new Date() - new Date(doc.lockedAt)) / (1000 * 60);
    
    if (minutesSinceLocked > 5) {
      console.log(`[Crash Recovery] Document ${doc.id} orphaned for 5 mins. Marking as failed.`);
      const [updatedDoc] = await db
        .update(documents)
        .set({
          status: "failed",
          processingError: "Server restart interrupted processing. Please try again.",
          lockedAt: null,
        })
        .where(eq(documents.id, documentId))
        .returning();
      
      doc = updatedDoc;
    }
  }

  return new ApiResponse(200, { document: doc }, "Status synchronized").send(res);
});

// DELETE /api/v1/class/:classId/subject/:subjectId/document/:documentId
export const deleteDocument = asyncHandler(async (req, res) => {
  const parsed = documentIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { classId, documentId } = parsed.data;
  const subjectId = req.params.subjectId;

  // Soft delete — only if not already deleted
  const [deleted] = await db
    .update(documents)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(documents.id, documentId),
        eq(documents.classId, classId),
        subjectId ? eq(documents.subjectId, subjectId) : undefined,
        isNull(documents.deletedAt)
      )
    )
    .returning();

  if (!deleted) {
    throw new AppError(404, "Document not found");
  }

  return new ApiResponse(200, null, "Document deleted").send(res);
});
