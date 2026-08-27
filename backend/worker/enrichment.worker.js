import db from "../db/connectDb.js";
import { documents, documentChunks } from "../models/Db.schema.js";
import { enrichDocumentFromFile } from "../services/llm.service.js";
import { downloadBuffer } from "../services/cloudinary.service.js";
import { eq, sql } from "drizzle-orm";

const DEFAULT_LOCK_TIMEOUT_MINUTES = 10;
const parsedLockTimeoutMinutes = Number(
  process.env.DOCUMENT_WORKER_LOCK_TIMEOUT_MINUTES,
);
const LOCK_TIMEOUT_MINUTES =
  Number.isFinite(parsedLockTimeoutMinutes) && parsedLockTimeoutMinutes > 0
    ? parsedLockTimeoutMinutes
    : DEFAULT_LOCK_TIMEOUT_MINUTES;

let shouldStop = false;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function claimNextDocument() {
  const result = await db.execute(sql`
    UPDATE documents
    SET locked_at = now()
    WHERE id = (
      SELECT id
      FROM documents
      WHERE status = 'processing'
        AND deleted_at IS NULL
        AND (locked_at IS NULL OR locked_at < now() - (${LOCK_TIMEOUT_MINUTES} * interval '1 minute'))
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  const rows = Array.isArray(result) ? result : (result?.rows ?? []);
  return rows[0] ?? null;
}

async function pickAndProcess() {
  const doc = await claimNextDocument();
  if (!doc) return false;

  console.log("Worker picked document:", doc.id);
  try {
    const rawBuffer = await downloadBuffer(doc.filePath);
    const llm = await enrichDocumentFromFile({
      fileBuffer: rawBuffer,
      mimeType: doc.mimeType,
      fileName: doc.documentName,
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
          processingError: null,
          lockedAt: null,
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
      .set({
        processingError:
          typeof err?.message === "string"
            ? err.message.slice(0, 500)
            : "Unknown processing error",
        status: "failed",
        lockedAt: null,
      })
      .where(eq(documents.id, doc.id));
  }

  return true;
}

async function run() {
  console.log("Enrichment worker started");
  while (!shouldStop) {
    try {
      const did = await pickAndProcess();
      if (!did) await sleep(3000);
    } catch (err) {
      console.error("Worker loop error", err);
      await sleep(5000);
    }
  }
  console.log("Enrichment worker stopped");
}

function requestShutdown(signal) {
  if (shouldStop) return;
  shouldStop = true;
  console.log(`${signal} received, finishing current job before exit`);
}

process.on("SIGTERM", () => requestShutdown("SIGTERM"));
process.on("SIGINT", () => requestShutdown("SIGINT"));

run();
