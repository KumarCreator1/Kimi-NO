const PDF_MIME = "application/pdf";
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/jpg"]);
const DOC_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// returns true if mime type is in the supported document types set of (PDF, DOC, DOCX)
function isSupportedDocumentMime(mimeType) {
  return mimeType === PDF_MIME || DOC_MIMES.has(mimeType);
}

// returns true if mime type is in the supported image types set of (PNG, JPEG, JPG)
function isSupportedImageMime(mimeType) {
  return IMAGE_MIMES.has(mimeType);
}

// returns true if this mime type needs async DOCX->PDF conversion (via Cloudinary Aspose)
function isConvertibleDocMime(mimeType) {
  return DOC_MIMES.has(mimeType);
}

// Classifies an upload and tells the controller which path to take.
// Does NOT do any conversion itself — DOCX/DOC conversion is asynchronous,
// handled by Cloudinary's Aspose add-on + conversion.worker.js polling.
//
// Returns one of:
//   { kind: "image", buffer, mimeType, fileName }
//   { kind: "pdf",   buffer, mimeType, fileName }   -- fileName forced to end in .pdf
//   { kind: "needs_conversion", buffer, mimeType, fileName }
//
// Throws if mimeType isn't supported at all.
function classifyUpload({ buffer, mimeType, originalName }) {
  if (isSupportedImageMime(mimeType)) {
    return { kind: "image", buffer, mimeType, fileName: originalName };
  }

  if (mimeType === PDF_MIME) {
    const fileName = originalName.endsWith(".pdf")
      ? originalName
      : `${originalName}.pdf`;
    return { kind: "pdf", buffer, mimeType, fileName };
  }

  if (isConvertibleDocMime(mimeType)) {
    return {
      kind: "needs_conversion",
      buffer,
      mimeType,
      fileName: originalName,
    };
  }

  throw new Error(`Unsupported upload type: ${mimeType}`);
}

export {
  classifyUpload,
  isSupportedDocumentMime,
  isSupportedImageMime,
  isConvertibleDocMime,
};
