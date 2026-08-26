// Minimal LLM adapter stub. Replace with real Gemini client integration.
async function enrichDocumentFromFile({ fileBuffer, mimeType, fileName }) {
  // This function should call your Gemini LLM with file bytes or inline data
  // and return a strict structured object:
  // { aiTitle, aiSummary, topics: string[], chunks: [{ index, content }] }
  // Embeddings can be generated later by the worker or a separate step.

  // Temporary stubbed response for local development / worker testing
  return {
    aiTitle: "(stub) Generated title",
    aiSummary: `
      (stub) Short summary of ${fileName || "the uploaded file"}.
    `.trim(),
    topics: ["stub-topic"],
    chunks: [
      {
        index: 0,
        content: "(stub) chunk content",
      },
    ],
  };
}

export { enrichDocumentFromFile };
