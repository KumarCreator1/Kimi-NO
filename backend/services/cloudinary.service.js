import { v2 as cloudinary } from "cloudinary";

// Configure via CLOUDINARY_URL or individual env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function uploadBuffer(buffer, filename, mimeType) {
  // convert buffer to data URI
  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  const res = await cloudinary.uploader.upload(dataUri, {
    resource_type: "auto",
    public_id: `documents/${Date.now()}_${filename}`,
    folder: "kimi_no/documents",
  });

  return {
    publicId: res.public_id,
    url: res.secure_url,
    bytes: res.bytes,
    format: res.format,
  };
}

// Upload a raw Office document (DOC/DOCX) and ask Cloudinary's Aspose
// add-on to convert it to PDF. Conversion happens asynchronously — this
// call only confirms the raw file made it to Cloudinary, NOT that the
// PDF exists yet. Use getConvertedPdfIfReady() to check/poll for it.
async function uploadRawForConversion(buffer, filename, mimeType) {
  const base64 = buffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  const res = await cloudinary.uploader.upload(dataUri, {
    resource_type: "raw",
    raw_convert: "aspose",
    public_id: `documents/${Date.now()}_${filename}`,
    folder: "kimi_no/documents",
  });

  return {
    publicId: res.public_id, // the converted PDF will appear under this same public_id
    rawUrl: res.secure_url,
  };
}

// Returns the converted PDF's info if Aspose has finished, or null if
// conversion is still pending. Throws on any other error (network,
// auth, etc.) so the caller's retry/backoff can distinguish the two.
async function getConvertedPdfIfReady(publicId) {
  try {
    const res = await cloudinary.api.resource(publicId, {
      resource_type: "image", // Aspose lands the converted PDF here, same public_id
    });
    return { url: res.secure_url, bytes: res.bytes, format: res.format };
  } catch (err) {
    const httpCode = err?.http_code ?? err?.error?.http_code;
    if (httpCode === 404) {
      return null; // not converted yet
    }
    throw err;
  }
}

async function downloadBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Cloudinary returned 401 Unauthorized. By default, Cloudinary disables PDF delivery for new free accounts. Please go to your Cloudinary Dashboard -> Settings -> Security -> and check 'Allow delivery of PDF and ZIP files'.",
      );
    }
    throw new Error(
      `Failed to download file from Cloudinary: ${response.status}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function deleteByPublicId(publicId, resourceType = "auto") {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export {
  uploadBuffer,
  uploadRawForConversion,
  getConvertedPdfIfReady,
  downloadBuffer,
  deleteByPublicId,
};
