import crypto from "node:crypto";
import asyncHandler from "./asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import env from "../config/env.js";

const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};

// Guards /api/bot/* - requires the X-Bot-Secret header to match BOT_SHARED_SECRET.
const botAuth = asyncHandler(async (req, _res, next) => {
  const provided = req.headers["x-bot-secret"];
  if (!safeEqual(provided, env.BOT_SHARED_SECRET)) {
    throw new ApiError(401, "Bot autorizatsiyasi noto'g'ri");
  }
  req.isBot = true;
  // Sentinel for the audit-log middleware so it can record bot-originated actions.
  req.user = { _id: null, role: "bot" };
  next();
});

export default botAuth;
