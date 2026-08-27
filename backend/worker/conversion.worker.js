import db from "../db/connectDb.js";
import { documents } from "../models/Db.schema.js";
import { getConvertedPdfIfReady } from "../services/cloudinary.service.js";
import { eq, sql } from "drizzle-orm";

const POLL_INTERVAL_MS = 3000;

const DEFAULT_LOCK_TIMEOUT_MINUTES = 10;
const parsedLockTimeoutMinutes = Number(
  process.env.CONVERSION_WORKER_LOCK_TIMEOUT_MINUTES,
);
const LOCK_TIMEOUT_MINUTES =
  Number.isFinite(parsedLockTimeoutMinutes) && parsedLockTimeoutMinutes > 0
    ? parsedLockTimeoutMinutes
    : DEFAULT_LOCK_TIMEOUT_MINUTES;

// Cloudinary/Aspose docs say conversion can take "up to a few minutes" —
// give it real headroom before giving up.
const DEFAULT_MAX_CONVERSION_WAIT_MINUTES = 15;
const parsedMaxWaitMinutes = Number(process.env.CONVERSION_MAX_WAIT_MINUTES);
const MAX_CONVERSION_WAIT_MINUTES =
  Number.isFinite(parsedMaxWaitMinutes) && parsedMaxWaitMinutes > 0
    ? parsedMaxWaitMinutes
    : DEFAULT_MAX_CONVERSION_WAIT_MINUTES;

let shouldStop = false;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function claimNextConverting() {
  const result = await db.execute(sql`
    UPDATE documents
    SET locked_at = now()
    WHERE id = (
      SELECT id
      FROM documents
      WHERE status = 'converting'
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

async function pickAndCheck() {
  const doc = await claimNextConverting();
  if (!doc) return false;

  console.log("Conversion worker checking document:", doc.id);

  try {
    if (!doc.conversionPublicId) {
      throw new Error("Document has no conversionPublicId to check");
    }

    const converted = await getConvertedPdfIfReady(doc.conversionPublicId);

    if (converted) {
      // Conversion is done — hand off to enrichment.worker.js by flipping
      // status to "processing". That worker only ever looks at status,
      // so this is the entire handoff; no direct coupling between workers.
      await db
        .update(documents)
        .set({
          filePath: converted.url,
          fileSize: converted.bytes,
          mimeType: "application/pdf",
          status: "processing",
          processingError: null,
          lockedAt: null,
        })
        .where(eq(documents.id, doc.id));

      console.log("Conversion complete, handed off to enrichment:", doc.id);
      return true;
    }

    // Not converted yet. Check for a stuck/timed-out conversion, otherwise
    // release the lock so it's picked up again on a later poll.
    const ageMinutes = (Date.now() - new Date(doc.createdAt).getTime()) / 60000;

    if (ageMinutes > MAX_CONVERSION_WAIT_MINUTES) {
      await db
        .update(documents)
        .set({
          status: "failed",
          processingError: `Document conversion did not complete within ${MAX_CONVERSION_WAIT_MINUTES} minutes`,
          lockedAt: null,
        })
        .where(eq(documents.id, doc.id));
      console.warn("Conversion timed out:", doc.id);
    } else {
      await db
        .update(documents)
        .set({ lockedAt: null })
        .where(eq(documents.id, doc.id));
    }

    return true;
  } catch (err) {
    // A failed *check* (e.g. transient Cloudinary API error) is not the
    // same as a failed conversion — log the error but leave status as
    // "converting" so it's retried on a later poll. Only the age-based
    // timeout above should ever move a document to "failed" from here.
    console.error("Conversion check failed for", doc.id, err);
    await db
      .update(documents)
      .set({
        processingError:
          typeof err?.message === "string"
            ? err.message.slice(0, 500)
            : "Unknown conversion check error",
        lockedAt: null,
      })
      .where(eq(documents.id, doc.id));
    return true;
  }
}

async function run() {
  console.log("Conversion worker started");
  while (!shouldStop) {
    try {
      const did = await pickAndCheck();
      if (!did) await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      console.error("Conversion worker loop error", err);
      await sleep(5000);
    }
  }
  console.log("Conversion worker stopped");
}

function requestShutdown(signal) {
  if (shouldStop) return;
  shouldStop = true;
  console.log(`${signal} received, finishing current check before exit`);
}

process.on("SIGTERM", () => requestShutdown("SIGTERM"));
process.on("SIGINT", () => requestShutdown("SIGINT"));

run();
