const PDF_MIME = "application/pdf";
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const DOC_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function guessExtension(mimeType, originalName = "document") {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return ".jpg";
  if (mimeType === "application/msword") return ".doc";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return ".docx";
  const dotIndex = originalName.lastIndexOf(".");
  return dotIndex >= 0 ? originalName.slice(dotIndex) : "";
}

function isSupportedDocumentMime(mimeType) {
  return mimeType === PDF_MIME || DOC_MIMES.has(mimeType);
}

function isSupportedImageMime(mimeType) {
  return IMAGE_MIMES.has(mimeType);
}

async function convertDocumentToPdf({ buffer, mimeType, originalName }) {
  if (mimeType === PDF_MIME) {
    return {
      buffer,
      mimeType: PDF_MIME,
      fileName: originalName.endsWith(".pdf")
        ? originalName
        : `${originalName}.pdf`,
    };
  }

  if (!DOC_MIMES.has(mimeType)) {
    throw new Error(`Unsupported document mime type: ${mimeType}`);
  }

  const conversionUrl = process.env.DOCUMENT_CONVERSION_URL;
  if (!conversionUrl) {
    throw new Error(
      "DOCUMENT_CONVERSION_URL is required to convert DOC/DOCX uploads into PDF",
    );
  }

  const response = await fetch(conversionUrl, {
    method: "POST",
    headers: {
      "content-type": mimeType,
      "x-original-name": originalName,
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(
      `Document conversion failed with status ${response.status}`,
    );
  }

  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer: pdfBuffer,
    mimeType: PDF_MIME,
    fileName: originalName.replace(/\.[^.]+$/, ".pdf"),
  };
}

async function normalizeUploadToCanonicalFile({
  buffer,
  mimeType,
  originalName,
}) {
  if (isSupportedImageMime(mimeType)) {
    return {
      buffer,
      mimeType,
      fileName: originalName,
      kind: "image",
    };
  }

  if (isSupportedDocumentMime(mimeType)) {
    const pdf = await convertDocumentToPdf({ buffer, mimeType, originalName });
    return {
      ...pdf,
      kind: "document",
    };
  }

  throw new Error(`Unsupported upload type: ${mimeType}`);
}

export {
  normalizeUploadToCanonicalFile,
  isSupportedDocumentMime,
  isSupportedImageMime,
  guessExtension,
};
