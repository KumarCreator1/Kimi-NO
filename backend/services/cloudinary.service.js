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

async function downloadBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download file from Cloudinary: ${response.status}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function deleteByPublicId(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
}

export { uploadBuffer, downloadBuffer, deleteByPublicId };
