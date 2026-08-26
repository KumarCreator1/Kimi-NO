import db from "../db/connectDb.js";
import { documents, documentChunks } from "../models/Db.schema.js";
import { enrichDocumentFromFile } from "../services/llm.service.js";
import { downloadBuffer } from "../services/cloudinary.service.js";
import { normalizeUploadToCanonicalFile } from "../services/documentNormalization.service.js";
import { eq, and, isNull } from "drizzle-orm";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pickAndProcess() {
  // pick a single document with status 'processing'
  const pending = await db
    .select()
    .from(documents)
    .where(and(eq(documents.status, "processing"), isNull(documents.deletedAt)))
    .orderBy(documents.createdAt)
    .limit(1);

  const doc = pending[0];
  if (!doc) return false;

  console.log("Worker picked document:", doc.id);
  try {
    const rawBuffer = await downloadBuffer(doc.filePath);
    const canonical = await normalizeUploadToCanonicalFile({
      buffer: rawBuffer,
      mimeType: doc.mimeType,
      originalName: doc.documentName,
    });

    const llm = await enrichDocumentFromFile({
      fileBuffer: canonical.buffer,
      mimeType: canonical.mimeType,
      fileName: canonical.fileName,
    });

    // persist results in a transaction: update documents and insert chunks
    await db.transaction(async (tx) => {
      await tx
        .update(documents)
        .set({
          aiTitle: llm.aiTitle,
          aiSummary: llm.aiSummary,
          topics: llm.topics,
          status: "ready",
        })
        .where(eq(documents.id, doc.id));

      // Insert chunks (if any)
      if (Array.isArray(llm.chunks) && llm.chunks.length > 0) {
        const rows = llm.chunks.map((c) => ({
          documentId: doc.id,
          chunkIndex: c.index,
          content: c.content,
        }));
        await tx.insert(documentChunks).values(rows);
      }
    });

    console.log("Document processed", doc.id);
  } catch (err) {
    console.error("Worker failed for document", doc.id, err);
    await db
      .update(documents)
      .set({ processingError: String(err), status: "failed" })
      .where(eq(documents.id, doc.id));
  }

  return true;
}

async function run() {
  console.log("Enrichment worker started");
  while (true) {
    try {
      const did = await pickAndProcess();
      if (!did) await sleep(3000);
    } catch (err) {
      console.error("Worker loop error", err);
      await sleep(5000);
    }
  }
}

run();
