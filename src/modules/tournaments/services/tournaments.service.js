import Tournament from "../../../models/tournament.model.js";
import Stage from "../../../models/stage.model.js";
import Group from "../../../models/group.model.js";
import TournamentRegistration, {
  REGISTRATION_STATUS,
} from "../../../models/tournamentRegistration.model.js";
import ApiError from "../../../utils/ApiError.js";
import {
  TOURNAMENT_STATUS,
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_MODE,
  canTransition,
  ACTIVE_TOURNAMENT_STATUSES,
  DEFAULT_STAGES_COUNT,
  MAX_STAGES_COUNT,
  stageNumberFromStatus,
  stageStatusFor,
} from "../../../constants/tournament.js";
import { BROADCAST_TARGET } from "../../../models/broadcastJob.model.js";
import * as stagesService from "../../stages/services/stages.service.js";
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

const ensureStagesCount = (n) => {
  const v = Number(n) || DEFAULT_STAGES_COUNT;
  if (v < 1 || v > MAX_STAGES_COUNT) {
    throw new ApiError(400, `Bosqichlar soni 1..${MAX_STAGES_COUNT} oraliqda bo'lishi kerak`);
  }
  return v;
};

const createStagesForTournament = async (tournamentId, count) => {
  const docs = Array.from({ length: count }, (_, i) => ({
    tournament: tournamentId,
    order: i + 1,
  }));
  return Stage.insertMany(docs);
};

const replaceStagesForTournament = async (tournamentId, count) => {
  const existing = await Stage.find({ tournament: tournamentId }).select("_id");
  const ids = existing.map((s) => s._id);
  if (ids.length) {
    await Group.deleteMany({ stage: { $in: ids } });
    await Stage.deleteMany({ _id: { $in: ids } });
  }
  await createStagesForTournament(tournamentId, count);
};

// Attach `stages` array to a tournament document (lean-style).
const withStages = async (tournament) => {
  if (!tournament) return tournament;
  const stages = await Stage.find({ tournament: tournament._id }).sort({ order: 1 });
  const obj = tournament.toJSON ? tournament.toJSON() : tournament;
  obj.stages = stages.map((s) => s.toJSON());
  return obj;
};

export const list = async ({ search, status, mode, page = 1, limit = 20 }) => {
  const filter = {};
  if (status) filter.status = status;
  if (mode) filter.mode = mode;
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ title: rx }, { slug: rx }];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Tournament.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Tournament.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

export const getById = async (id) => {
  const t = await Tournament.findById(id);
  if (!t) throw new ApiError(404, "Turnir topilmadi");
  return withStages(t);
};

// Raw getter used internally when stages population is not needed.
const getRawById = async (id) => {
  const t = await Tournament.findById(id);
  if (!t) throw new ApiError(404, "Turnir topilmadi");
  return t;
};

export const create = async (body) => {
  if (!Object.values(TOURNAMENT_MODE).includes(body.mode)) {
    throw new ApiError(400, "Noto'g'ri o'yin rejimi");
  }
  const stagesCount = ensureStagesCount(body.stagesCount);
  const slug = await buildUniqueSlug(body.title);

  const t = await Tournament.create({
    title: body.title.trim(),
    slug,
    banner: body.banner?.trim() || "",
    description: body.description?.trim() || "",
    prizePool: body.prizePool?.trim() || "",
    mode: body.mode,
    startDate: body.startDate ? new Date(body.startDate) : null,
    sponsorChannels: [],
    maps: Array.isArray(body.maps) ? body.maps.filter(Boolean) : [],
    maxTeams: body.maxTeams ?? 60,
    stagesCount,
    status: TOURNAMENT_STATUS.DRAFT,
  });

  await createStagesForTournament(t._id, stagesCount);
  return withStages(t);
};

export const update = async (id, body) => {
  const t = await getRawById(id);

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
  if (body.startDate !== undefined) {
    t.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.maps !== undefined) {
    t.maps = Array.isArray(body.maps) ? body.maps.filter(Boolean) : [];
  }
  if (body.maxTeams !== undefined) t.maxTeams = body.maxTeams;

  if (body.stagesCount !== undefined) {
    const nextCount = ensureStagesCount(body.stagesCount);
    if (nextCount !== t.stagesCount) {
      if (t.status !== TOURNAMENT_STATUS.DRAFT) {
        throw new ApiError(400, "Bosqichlar sonini faqat qoralama turnirda o'zgartirish mumkin");
      }
      t.stagesCount = nextCount;
      await t.save();
      await replaceStagesForTournament(t._id, nextCount);
      return withStages(t);
    }
  }

  await t.save();
  return withStages(t);
};

export const remove = async (id) => {
  const t = await getRawById(id);
  if (ACTIVE_TOURNAMENT_STATUSES.includes(t.status) || t.status === TOURNAMENT_STATUS.FINISHED) {
    throw new ApiError(400, "Faol yoki yakunlangan turnirni o'chirib bo'lmaydi");
  }
  // Stage + Group klinap.
  const stages = await Stage.find({ tournament: t._id }).select("_id");
  const stageIds = stages.map((s) => s._id);
  if (stageIds.length) {
    await Group.deleteMany({ stage: { $in: stageIds } });
    await Stage.deleteMany({ _id: { $in: stageIds } });
  }
  await t.deleteOne();
};

// Status transitions that should auto-notify users via a broadcast.
const NOTIFY_ON = {
  [TOURNAMENT_STATUS.ANNOUNCED]: { target: BROADCAST_TARGET.ALL, ids: [] },
  [TOURNAMENT_STATUS.REGISTRATION]: { target: BROADCAST_TARGET.ALL, ids: [] },
  [TOURNAMENT_STATUS.FINISHED]: { target: BROADCAST_TARGET.TOURNAMENT, ids: ["self"] },
};

const enqueueStatusBroadcast = async (tournament, next, currentUser) => {
  const cfg = NOTIFY_ON[next];
  if (!cfg) return;
  try {
    const { create } = await import("../../broadcasts/services/broadcasts.service.js");
    const title = `${tournament.title} - ${TOURNAMENT_STATUS_LABELS[next] || next}`;
    const body =
      next === TOURNAMENT_STATUS.FINISHED
        ? `<b>${tournament.title}</b> turnirining yakuni e'lon qilindi. Natijalar tez orada chiqadi.`
        : `<b>${tournament.title}</b> - yangi status: ${TOURNAMENT_STATUS_LABELS[next] || next}.`;
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

// Map a target status (stageN | final) to the stage `order` it represents.
const stageOrderForStatus = (status, stagesCount) => {
  if (status === TOURNAMENT_STATUS.FINAL) return stagesCount;
  return stageNumberFromStatus(status);
};

export const changeStatus = async (id, next, currentUser) => {
  const t = await getRawById(id);
  if (!Object.values(TOURNAMENT_STATUS).includes(next)) {
    throw new ApiError(400, "Noto'g'ri status");
  }
  if (!canTransition(t.status, next, t.stagesCount)) {
    throw new ApiError(400, `${t.status} → ${next} o'tish ruxsat etilmagan`);
  }

  // registration → stage1: auto-fill the first stage with all registered teams.
  if (
    t.status === TOURNAMENT_STATUS.REGISTRATION &&
    next === stageStatusFor(1, t.stagesCount)
  ) {
    const regs = await TournamentRegistration.find({
      tournament: t._id,
      status: REGISTRATION_STATUS.REGISTERED,
    }).select("_id");
    const stage = await stagesService.getByTournamentAndOrder(t._id, 1);
    await stagesService.autoAssignGroups(stage._id, regs.map((r) => r._id));
  }

  t.status = next;
  await t.save();

  await enqueueStatusBroadcast(t, next, currentUser);

  return withStages(t);
};

// Promote selected teams to the next stage and switch status atomically.
export const promoteToNext = async (id, teamIds, currentUser) => {
  const t = await getRawById(id);
  const currentOrder = stageOrderForStatus(t.status, t.stagesCount);
  if (!currentOrder) {
    throw new ApiError(400, "Turnir aktiv bosqichda emas");
  }
  if (currentOrder >= t.stagesCount) {
    throw new ApiError(400, "Bu oxirgi bosqich, keyingisi yo'q");
  }
  const nextStatus = stageStatusFor(currentOrder + 1, t.stagesCount);
  if (!nextStatus || !canTransition(t.status, nextStatus, t.stagesCount)) {
    throw new ApiError(400, "Keyingi bosqichga o'tib bo'lmaydi");
  }

  const nextStage = await stagesService.getByTournamentAndOrder(t._id, currentOrder + 1);
  await stagesService.autoAssignGroups(nextStage._id, teamIds || []);

  t.status = nextStatus;
  await t.save();

  await enqueueStatusBroadcast(t, nextStatus, currentUser);

  return withStages(t);
};

// Sponsor channels (Phase 3 verifies TG membership; here we just store the list).
export const addSponsorChannel = async (id, body) => {
  const t = await getRawById(id);
  if (!["telegram", "social"].includes(body.type)) {
    throw new ApiError(400, "Noto'g'ri kanal turi");
  }
  t.sponsorChannels.push({
    type: body.type,
    title: body.title.trim(),
    url: body.url.trim(),
    chatId: body.chatId?.trim() || "",
  });
  await t.save();
  return withStages(t);
};

export const removeSponsorChannel = async (id, channelId) => {
  const t = await getRawById(id);
  const before = t.sponsorChannels.length;
  t.sponsorChannels = t.sponsorChannels.filter(
    (c) => String(c._id) !== String(channelId),
  );
  if (t.sponsorChannels.length === before) {
    throw new ApiError(404, "Kanal topilmadi");
  }
  await t.save();
  return withStages(t);
};
