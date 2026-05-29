import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ApiError from "./ApiError.js";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

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
  const resp = await fetch(remoteUrl);
  if (!resp.ok) throw new ApiError(400, "Rasmni yuklab bo'lmadi");

  const mime = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = MIME_EXT[mime];
  if (!ext) throw new ApiError(400, "Faqat rasmlar (jpg/png/webp/gif)");

  const buf = Buffer.from(await resp.arrayBuffer());
  if (!buf.length) throw new ApiError(400, "Bo'sh fayl");
  if (buf.length > MAX_SIZE) throw new ApiError(400, "Rasm 5MB dan katta bo'lmasligi kerak");

  const name = buildUploadName(ext);
  await fs.promises.writeFile(path.join(UPLOADS_DIR, name), buf);
  return `/uploads/${name}`;
};
