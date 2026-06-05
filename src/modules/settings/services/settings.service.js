import Setting from "../../../models/setting.model.js";
import ApiError from "../../../utils/ApiError.js";
import { parseTelegramUsername } from "../../../utils/telegramUsername.js";

// Global config is a singleton - one document, created on first access.
const getOrCreate = async () => {
  let doc = await Setting.findOne();
  if (!doc) doc = await Setting.create({});
  return doc;
};

export const get = async () => getOrCreate();

export const update = async (body) => {
  const doc = await getOrCreate();
  if (body.vipAdminUsername !== undefined) {
    const raw = body.vipAdminUsername.trim();
    if (raw) {
      const username = parseTelegramUsername(raw);
      if (!username) throw new ApiError(400, "Noto'g'ri Telegram username");
      doc.vipAdminUsername = username;
    } else {
      doc.vipAdminUsername = "";
    }
  }
  await doc.save();
  return doc;
};

// Resolves the VIP admin contact as a t.me link (empty string when unset).
export const getVipAdminUrl = async () => {
  const doc = await getOrCreate();
  return doc.vipAdminUsername ? `https://t.me/${doc.vipAdminUsername}` : "";
};
