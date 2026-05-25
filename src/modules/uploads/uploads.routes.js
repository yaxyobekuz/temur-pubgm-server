import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { PERMISSIONS } from "../../constants/permissions.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".bin").slice(0, 8);
    const id = crypto.randomBytes(12).toString("hex");
    cb(null, `${Date.now()}_${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new ApiError(400, "Faqat rasmlar (jpg/png/webp/gif)"));
    }
    cb(null, true);
  },
});

const router = Router();

router.post(
  "/image",
  requireAuth,
  requirePermission(PERMISSIONS.BROADCASTS_CREATE),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "Fayl yuborilmadi");
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({
      success: true,
      data: { url, size: req.file.size, mimetype: req.file.mimetype },
      message: "Yuklandi",
    });
  }),
);

export default router;
