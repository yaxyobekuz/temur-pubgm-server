import User from "../models/user.model.js";
import logger from "../config/logger.js";
import * as botClient from "./botClient.service.js";

// Foydalanuvchi ko'rinadigan ismi: ism + familiya || tgUsername || "O'yinchi".
export const displayName = (u) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.tgUsername || "O'yinchi";

// Bitta foydalanuvchiga best-effort DM. Hech qachon throw qilmaydi (bot bloklangan yoki
// o'chiq bo'lsa ham mutatsiyani buzmaydi). tgId bo'lmasa jim o'tkazib yuboradi.
export const notifyUser = async ({ tgId, text, buttons }) => {
  if (!tgId) return false;
  try {
    await botClient.sendMessage({ chatId: tgId, text, parseMode: "HTML", buttons });
    return true;
  } catch (err) {
    logger.warn({ err: err.message, tgId }, "notifyUser DM xato");
    return false;
  }
};

// Bitta user id'dan { tgId, name } oladi. Topilmasa null.
export const resolveRecipient = async (userId) => {
  if (!userId) return null;
  const u = await User.findById(userId, "tgId firstName lastName tgUsername").lean();
  return u ? { tgId: u.tgId, name: displayName(u) } : null;
};

// Ko'p user id uchun batch: Map<userIdString, { tgId, name }> (promote/final uchun, N+1 dan qochish).
export const resolveRecipients = async (userIds = []) => {
  const ids = [...new Set(userIds.map(String).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return map;
  const users = await User.find({ _id: { $in: ids } }, "tgId firstName lastName tgUsername").lean();
  for (const u of users) map.set(String(u._id), { tgId: u.tgId, name: displayName(u) });
  return map;
};
