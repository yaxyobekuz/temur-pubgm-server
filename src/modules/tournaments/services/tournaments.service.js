import Tournament from "../../../models/tournament.model.js";
import Region from "../../../models/region.model.js";
import ApiError from "../../../utils/ApiError.js";
import {
  TOURNAMENT_STATUS,
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_MODE,
  canTransition,
  ACTIVE_TOURNAMENT_STATUSES,
} from "../../../constants/tournament.js";
import { BROADCAST_TARGET } from "../../../models/broadcastJob.model.js";
import logger from "../../../config/logger.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const buildUniqueSlug = async (base) => {
  const slug = slugify(base) || `tournament-${Date.now().toString(36)}`;
  const exists = await Tournament.findOne({ slug });
  if (!exists) return slug;
  // Suffix with a short timestamp to disambiguate.
  return `${slug}-${Date.now().toString(36).slice(-4)}`;
};

export const list = async ({ search, status, mode, regionId, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;
  if (mode) filter.mode = mode;
  if (regionId) filter.region = regionId;
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ title: rx }, { slug: rx }];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Tournament.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("region", "name code timezone"),
    Tournament.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

export const getById = async (id) => {
  const t = await Tournament.findById(id).populate("region", "name code timezone");
  if (!t) throw new ApiError(404, "Turnir topilmadi");
  return t;
};

export const create = async (body) => {
  if (!Object.values(TOURNAMENT_MODE).includes(body.mode)) {
    throw new ApiError(400, "Noto'g'ri o'yin rejimi");
  }
  if (body.regionId) {
    const region = await Region.findById(body.regionId);
    if (!region || !region.isActive) throw new ApiError(404, "Mintaqa topilmadi yoki nofaol");
  }
  const slug = await buildUniqueSlug(body.title);

  const t = await Tournament.create({
    title: body.title.trim(),
    slug,
    banner: body.banner?.trim() || "",
    description: body.description?.trim() || "",
    prizePool: body.prizePool?.trim() || "",
    mode: body.mode,
    region: body.regionId || null,
    startDate: body.startDate ? new Date(body.startDate) : null,
    sponsorChannels: [],
    maps: Array.isArray(body.maps) ? body.maps.filter(Boolean) : [],
    maxTeams: body.maxTeams ?? 60,
    status: TOURNAMENT_STATUS.DRAFT,
  });
  return t.populate("region", "name code timezone");
};

export const update = async (id, body) => {
  const t = await getById(id);

  if (body.title !== undefined) {
    t.title = body.title.trim();
  }
  if (body.banner !== undefined) t.banner = body.banner.trim();
  if (body.description !== undefined) t.description = body.description.trim();
  if (body.prizePool !== undefined) t.prizePool = body.prizePool.trim();
  if (body.mode !== undefined) {
    if (!Object.values(TOURNAMENT_MODE).includes(body.mode)) {
      throw new ApiError(400, "Noto'g'ri o'yin rejimi");
    }
    if (t.status !== TOURNAMENT_STATUS.DRAFT) {
      throw new ApiError(400, "Rejimni faqat qoralama turnirda o'zgartirish mumkin");
    }
    t.mode = body.mode;
  }
  if (body.regionId !== undefined) {
    if (body.regionId) {
      const region = await Region.findById(body.regionId);
      if (!region || !region.isActive) throw new ApiError(404, "Mintaqa topilmadi yoki nofaol");
      t.region = region._id;
    } else {
      t.region = null;
    }
  }
  if (body.startDate !== undefined) {
    t.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.maps !== undefined) {
    t.maps = Array.isArray(body.maps) ? body.maps.filter(Boolean) : [];
  }
  if (body.maxTeams !== undefined) t.maxTeams = body.maxTeams;

  await t.save();
  return t.populate("region", "name code timezone");
};

export const remove = async (id) => {
  const t = await getById(id);
  if (ACTIVE_TOURNAMENT_STATUSES.includes(t.status) || t.status === TOURNAMENT_STATUS.FINISHED) {
    throw new ApiError(400, "Faol yoki yakunlangan turnirni o'chirib bo'lmaydi");
  }
  await t.deleteOne();
};

// Status transitions that should auto-notify users via a broadcast.
// ALL  - announced/registration: open to anyone who has tgId.
// TOURNAMENT - finished: only registered participants.
const NOTIFY_ON = {
  [TOURNAMENT_STATUS.ANNOUNCED]: { target: BROADCAST_TARGET.ALL, ids: [] },
  [TOURNAMENT_STATUS.REGISTRATION]: { target: BROADCAST_TARGET.ALL, ids: [] },
  [TOURNAMENT_STATUS.FINISHED]: { target: BROADCAST_TARGET.TOURNAMENT, ids: ["self"] },
};

const enqueueStatusBroadcast = async (tournament, next, currentUser) => {
  const cfg = NOTIFY_ON[next];
  if (!cfg) return;
  try {
    // Lazy import to avoid the tournaments↔broadcasts circular reference at module load.
    const { create } = await import("../../broadcasts/services/broadcasts.service.js");
    const title = `${tournament.title} - ${TOURNAMENT_STATUS_LABELS[next] || next}`;
    const body =
      next === TOURNAMENT_STATUS.FINISHED
        ? `<b>${tournament.title}</b> turnirining yakuni e'lon qilindi. Natijalar tez orada chiqadi.`
        : `<b>${tournament.title}</b> - yangi status: ${TOURNAMENT_STATUS_LABELS[next]}.`;
    const target = {
      type: cfg.target,
      ids: cfg.ids[0] === "self" ? [tournament._id.toString()] : cfg.ids,
    };
    await create({ title, body, target }, currentUser);
  } catch (err) {
    logger.warn(
      { err: err.message, tournamentId: tournament._id, next },
      "Status broadcast enqueue xato",
    );
  }
};

export const changeStatus = async (id, next, currentUser) => {
  const t = await getById(id);
  if (!Object.values(TOURNAMENT_STATUS).includes(next)) {
    throw new ApiError(400, "Noto'g'ri status");
  }
  if (!canTransition(t.status, next)) {
    throw new ApiError(400, `${t.status} → ${next} o'tish ruxsat etilmagan`);
  }
  t.status = next;
  await t.save();

  await enqueueStatusBroadcast(t, next, currentUser);

  return t.populate("region", "name code timezone");
};

// Sponsor channels (Phase 3 verifies TG membership; here we just store the list).
export const addSponsorChannel = async (id, body) => {
  const t = await getById(id);
  if (!["telegram", "social"].includes(body.type)) {
    throw new ApiError(400, "Noto'g'ri kanal turi");
  }
  t.sponsorChannels.push({
    type: body.type,
    title: body.title.trim(),
    url: body.url.trim(),
    chatId: body.chatId?.trim() || "",
    chatUsername: body.chatUsername?.trim() || "",
  });
  await t.save();
  return t.populate("region", "name code timezone");
};

export const removeSponsorChannel = async (id, channelId) => {
  const t = await getById(id);
  const before = t.sponsorChannels.length;
  t.sponsorChannels = t.sponsorChannels.filter(
    (c) => String(c._id) !== String(channelId),
  );
  if (t.sponsorChannels.length === before) {
    throw new ApiError(404, "Kanal topilmadi");
  }
  await t.save();
  return t.populate("region", "name code timezone");
};
