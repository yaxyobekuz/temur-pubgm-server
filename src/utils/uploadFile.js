import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ApiError from "./ApiError.js";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const URL_EXT = {
  ".jpg": ".jpg",
  ".jpeg": ".jpg",
  ".png": ".png",
  ".webp": ".webp",
  ".gif": ".gif",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Sniff the image type from the buffer's magic bytes (Telegram may send octet-stream).
const extFromMagic = (buf) => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return ".png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return ".gif";
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }
  return null;
};

// Build a unique stored filename, mirroring uploads.routes.js strategy.
export const buildUploadName = (ext) =>
  `${Date.now()}_${crypto.randomBytes(12).toString("hex")}${ext}`;

// Delete a previously stored upload given its public url ("/uploads/<name>").
// No-op for empty values or external URLs; silent if the file is already gone.
export const deleteUploadByUrl = async (url) => {
  if (!url || typeof url !== "string") return;
  if (!url.startsWith("/uploads/")) return;
  const name = path.basename(url); // path-traversal guard
  if (!name) return;
  try {
    await fs.promises.unlink(path.join(UPLOADS_DIR, name));
  } catch (err) {
    if (err.code !== "ENOENT") {
      // Don't block the request flow on a stale file; surface only unexpected errors as a warning.
      throw err;
    }
  }
};

// Download a remote image (e.g. a Telegram file URL) into UPLOADS_DIR.
// Returns the public "/uploads/<name>" path. Validates mime + size.
export const saveImageFromUrl = async (remoteUrl) => {
  if (!/^https?:\/\//i.test(remoteUrl || "")) {
    throw new ApiError(400, "Rasm havolasi noto'g'ri");
  }
  let resp;
  try {
    // Cap the download so a slow Telegram CDN can't hang the request indefinitely.
    resp = await fetch(remoteUrl, { signal: AbortSignal.timeout(180_000) });
  } catch {
    throw new ApiError(400, "Rasmni yuklab bo'lmadi (vaqt tugadi)");
  }
  if (!resp.ok) throw new ApiError(400, "Rasmni yuklab bo'lmadi");

  const buf = Buffer.from(await resp.arrayBuffer());
  if (!buf.length) throw new ApiError(400, "Bo'sh fayl");
  if (buf.length > MAX_SIZE) throw new ApiError(400, "Rasm 5MB dan katta bo'lmasligi kerak");

  // Resolve extension: content-type → URL path extension → magic bytes.
  const mime = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const urlExt = path.extname(new URL(remoteUrl).pathname).toLowerCase();
  const ext = MIME_EXT[mime] || URL_EXT[urlExt] || extFromMagic(buf);
  if (!ext) throw new ApiError(400, "Faqat rasmlar (jpg/png/webp/gif)");

  const name = buildUploadName(ext);
  await fs.promises.writeFile(path.join(UPLOADS_DIR, name), buf);
  return `/uploads/${name}`;
};
