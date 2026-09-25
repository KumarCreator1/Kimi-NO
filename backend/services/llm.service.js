import { GoogleGenAI, Type } from "@google/genai";

const MODEL = "gemini-3.5-flash";

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 15000;

const REQUEST_TIMEOUT_MS = 300_000;
const FILE_ACTIVE_POLL_INTERVAL_MS = 1500;
const FILE_ACTIVE_TIMEOUT_MS = 45_000;

const enrichmentResponseSchema = {
  type: Type.OBJECT,
  properties: {
    aiTitle: {
      type: Type.STRING,
      description:
        "A short, descriptive title for the document (max ~80 chars).",
    },
    aiSummary: {
      type: Type.STRING,
      description: "A concise 2-4 sentence summary of the document's content.",
    },
    topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-8  topic list covered in document",
    },
  },
  required: ["aiTitle", "aiSummary", "topics"],
};

// Helper functions for retrying and backoff
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt) {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempt - 1));
  const jitter = Math.random() * exp * 0.25;
  return exp + jitter;
}

// Distinguish "try again" from "don't bother" failures. Free-tier Gemini
// commonly throws 429 (RESOURCE_EXHAUSTED) and transient 503s — both
// retryable. Bad input / auth / unsupported mime are not.
function isRetryableError(err) {
  const status = err?.status ?? err?.code ?? err?.response?.status;
  if ([429, 500, 502, 503, 504].includes(Number(status))) return true;

  const msg = String(err?.message ?? err).toLowerCase();
  return (
    msg.includes("resource_exhausted") ||
    msg.includes("unavailable") ||
    msg.includes("rate limit") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("aborted")
  );
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function withRetry(fn, label) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const canRetry = attempt < MAX_ATTEMPTS && isRetryableError(err);
      console.error(
        `${label} failed (attempt ${attempt}/${MAX_ATTEMPTS})${canRetry ? ", retrying" : ""}:`,
        err?.message ?? err,
      );
      if (!canRetry) break;
      await sleep(backoffDelay(attempt));
    }
  }
  throw lastErr;
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
}

async function uploadFile(ai, { fileBuffer, mimeType, fileName }) {
  return withRetry(async () => {
    const blob = new Blob([fileBuffer], { type: mimeType });
    return withTimeout(
      ai.files.upload({
        file: blob,
        config: { mimeType, displayName: fileName },
      }),
      REQUEST_TIMEOUT_MS,
      "File upload",
    );
  }, "File upload");
}

async function waitForFileActive(ai, file) {
  const deadline = Date.now() + FILE_ACTIVE_TIMEOUT_MS;
  let current = file;

  while (current.state === "PROCESSING") {
    if (Date.now() > deadline) {
      throw new Error(`File ${current.name} did not become ACTIVE in time`);
    }
    await sleep(FILE_ACTIVE_POLL_INTERVAL_MS);
    current = await ai.files.get({ name: current.name });
  }

  if (current.state !== "ACTIVE") {
    throw new Error(
      `File ${current.name} ended in unexpected state: ${current.state}`,
    );
  }

  return current;
}

async function generateEnrichment(ai, file) {
  return withRetry(async () => {
    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
              {
                text:
                  "Analyze this document and produce a title, a concise summary, " +
                  "and topic tags describing its content. Respond only with the " +
                  "structured data requested.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: enrichmentResponseSchema,
        },
      }),
      REQUEST_TIMEOUT_MS,
      "Enrichment generation",
    );

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Gemini returned invalid JSON");
    }

    if (
      typeof parsed.aiTitle !== "string" ||
      typeof parsed.aiSummary !== "string" ||
      !Array.isArray(parsed.topics)
    ) {
      throw new Error("Gemini response did not match expected schema");
    }

    return {
      aiTitle: parsed.aiTitle.slice(0, 255),
      aiSummary: parsed.aiSummary,
      topics: parsed.topics.filter((t) => typeof t === "string").slice(0, 20),
    };
  }, "Enrichment generation");
}

async function cleanupFile(ai, fileName) {
  if (!fileName) return;
  try {
    await ai.files.delete({ name: fileName });
  } catch (err) {
    // best-effort — files auto-expire after 48h regardless
    console.error(
      "Failed to delete Gemini file",
      fileName,
      err?.message ?? err,
    );
  }
}

async function enrichDocumentFromFile({ fileBuffer, mimeType, fileName }) {
  const ai = getClient();
  let uploaded;

  try {
    uploaded = await uploadFile(ai, { fileBuffer, mimeType, fileName });
    const active = await waitForFileActive(ai, uploaded);
    const result = await generateEnrichment(ai, active);

    // chunking postponed — worker already handles an empty/absent chunks array
    return { ...result, chunks: [] };
  } finally {
    await cleanupFile(ai, uploaded?.name);
  }
}

export { enrichDocumentFromFile };
