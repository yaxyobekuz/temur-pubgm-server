import Tournament from "../../../models/tournament.model.js";
import Stage from "../../../models/stage.model.js";
import Group from "../../../models/group.model.js";
import HelpLink from "../../../models/helpLink.model.js";
import TournamentRegistration, {
  REGISTRATION_STATUS,
} from "../../../models/tournamentRegistration.model.js";
import ApiError from "../../../utils/ApiError.js";
import {
  TOURNAMENT_STATUS,
  TOURNAMENT_STATUS_LABELS,
  TOURNAMENT_MODE,
  ACTIVE_TOURNAMENT_STATUSES,
  DEFAULT_STAGES_COUNT,
  MAX_STAGES_COUNT,
  TEAM_PLACEMENT_KIND,
  getStageBlueprint,
  getStageLabel,
} from "../../../constants/tournament.js";
import { BROADCAST_TARGET } from "../../../models/broadcastJob.model.js";
import * as stagesService from "../../stages/services/stages.service.js";
import * as groupsService from "../../groups/services/groups.service.js";
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

// Creates the stages (each with its materialized config) and builds the stage-1 group
// skeleton so leaders can pick a day+time slot during the (pending) registration phase.
const createStagesForTournament = async (tournamentId, count) => {
  const docs = Array.from({ length: count }, (_, i) => ({
    tournament: tournamentId,
    order: i + 1,
    config: getStageBlueprint(i + 1, count),
  }));
  const stages = await Stage.insertMany(docs);
  const stage1 = stages.find((s) => s.order === 1);
  if (stage1) await stagesService.buildSkeleton(stage1);
  return stages;
};

const replaceStagesForTournament = async (tournamentId, count) => {
  const existing = await Stage.find({ tournament: tournamentId }).select("_id");
  const ids = existing.map((s) => s._id);
  if (ids.length) {
    await Group.deleteMany({ stage: { $in: ids } });
    await Stage.deleteMany({ _id: { $in: ids } });
  }
  return createStagesForTournament(tournamentId, count);
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
    adminContactUrl: body.adminContactUrl?.trim() || "",
    maps: Array.isArray(body.maps) ? body.maps.filter(Boolean) : [],
    maxTeams: body.maxTeams ?? 60,
    stagesCount,
    status: TOURNAMENT_STATUS.DRAFT,
    currentStage: 1,
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
    if (t.status !== TOURNAMENT_STATUS.PENDING) {
      throw new ApiError(400, "Rejimni faqat kutilayotgan turnirda o'zgartirish mumkin");
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
  if (body.adminContactUrl !== undefined) t.adminContactUrl = body.adminContactUrl.trim();

  if (body.stagesCount !== undefined) {
    const nextCount = ensureStagesCount(body.stagesCount);
    if (nextCount !== t.stagesCount) {
      if (t.status !== TOURNAMENT_STATUS.PENDING) {
        throw new ApiError(400, "Bosqichlar sonini faqat kutilayotgan turnirda o'zgartirish mumkin");
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
  [TOURNAMENT_STATUS.ONGOING]: { target: BROADCAST_TARGET.TOURNAMENT, ids: ["self"] },
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
        : `<b>${tournament.title}</b> - ${TOURNAMENT_STATUS_LABELS[next] || next}.`;
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

// Resolves the admin contact link for VIP requests: tournament field first, then the first
// active help link as a fallback.
const resolveAdminContactUrl = async (tournament) => {
  if (tournament.adminContactUrl) return tournament.adminContactUrl;
  const link = await HelpLink.findOne({ isActive: true }).sort({ order: 1 });
  return link?.url || "";
};

// Notify every tournament member that a new stage has opened, with an admin-contact button
// so non-advancing teams can request a VIP slot.
const enqueuePromoteBroadcast = async (tournament, nextOrder, currentUser) => {
  try {
    const { create } = await import("../../broadcasts/services/broadcasts.service.js");
    const stageLabel = getStageLabel(nextOrder, tournament.stagesCount);
    const title = `${tournament.title} - ${stageLabel}`;
    const body = [
      `<b>${tournament.title}</b> turnirida <b>${stageLabel}</b> ochildi.`,
      "",
      "O'tgan komandalar bot orqali kun va vaqtni tanlab joylashlari kerak.",
      "O'ta olmagan komandalar VIP slot olish uchun admin bilan bog'lanishlari mumkin.",
    ].join("\n");
    const url = await resolveAdminContactUrl(tournament);
    const buttons = url ? [{ text: "Admin bilan bog'lanish", url }] : [];
    await create(
      {
        title,
        body,
        buttons,
        target: { type: BROADCAST_TARGET.TOURNAMENT, ids: [tournament._id.toString()] },
      },
      currentUser,
    );
  } catch (err) {
    logger.warn(
      { err: err.message, tournamentId: tournament._id, nextOrder },
      "Promote broadcast enqueue xato",
    );
  }
};

export const changeStatus = async (id, next, currentUser) => {
  const t = await getRawById(id);
  if (!Object.values(TOURNAMENT_STATUS).includes(next)) {
    throw new ApiError(400, "Noto'g'ri status");
  }

  // pending → ongoing: teams are already placed into stage-1 groups at registration time
  // (each leader picked a day+time slot), so no auto-assignment is needed here.
  if (t.status === TOURNAMENT_STATUS.PENDING && next === TOURNAMENT_STATUS.ONGOING) {
    t.currentStage = 1;
  }

  t.status = next;
  await t.save();

  await enqueueStatusBroadcast(t, next, currentUser);

  return withStages(t);
};

// Admin picks the advancing places (1st/2nd/3rd) per group. Advancing teams are NOT placed
// into the next stage here - they are granted eligibility and pick a day+time slot via the bot.
// Bumps currentStage; status stays ONGOING. Notifies all tournament members.
export const promoteToNext = async (id, groupsPayload, currentUser) => {
  const t = await getRawById(id);
  if (t.status !== TOURNAMENT_STATUS.ONGOING) {
    throw new ApiError(400, "Turnir aktiv bosqichda emas");
  }
  if (t.currentStage >= t.stagesCount) {
    throw new ApiError(400, "Bu oxirgi bosqich, keyingisi yo'q");
  }
  if (!Array.isArray(groupsPayload) || !groupsPayload.length) {
    throw new ApiError(400, "O'tadigan komandalarni tanlang");
  }

  const currentStage = await stagesService.getByTournamentAndOrder(t._id, t.currentStage);
  const advancePlaces = currentStage.config.advancePlaces;

  // Validate places per group (1..advancePlaces, no duplicates) and gather advancing reg ids.
  const advancingIds = [];
  for (const g of groupsPayload) {
    const seen = new Set();
    for (const p of g.places || []) {
      if (p.place < 1 || p.place > advancePlaces) {
        throw new ApiError(400, `O'rin 1..${advancePlaces} oralig'ida bo'lishi kerak`);
      }
      if (seen.has(p.place)) {
        throw new ApiError(400, "Bitta guruhda o'rin takrorlanmasligi kerak");
      }
      seen.add(p.place);
      advancingIds.push(p.registrationId);
    }
  }
  if (!advancingIds.length) {
    throw new ApiError(400, "O'tadigan komandalarni tanlang");
  }

  const nextOrder = t.currentStage + 1;
  const nextStage = await stagesService.getByTournamentAndOrder(t._id, nextOrder);
  await stagesService.buildSkeleton(nextStage);

  // Grant eligibility; the leader will pick the slot in the bot. Tag as ADVANCED.
  await TournamentRegistration.updateMany(
    { _id: { $in: advancingIds } },
    { $set: { eligibleStage: nextOrder, nextPlacementKind: TEAM_PLACEMENT_KIND.ADVANCED } },
  );

  t.currentStage = nextOrder;
  await t.save();

  await enqueuePromoteBroadcast(t, nextOrder, currentUser);

  return withStages(t);
};

// Open a VIP slot: grant a non-advanced team eligibility for the current stage. The team then
// picks a day+time slot via the bot, just like advanced teams. Enforces remaining capacity.
export const openVipSlot = async (id, registrationId, currentUser) => {
  const t = await getRawById(id);
  if (t.status !== TOURNAMENT_STATUS.ONGOING) {
    throw new ApiError(400, "Turnir aktiv bosqichda emas");
  }
  if (t.currentStage < 2) {
    throw new ApiError(400, "VIP slot faqat 2-bosqichdan boshlab beriladi");
  }

  const stage = await stagesService.getByTournamentAndOrder(t._id, t.currentStage);
  const { vipRemaining } = await groupsService.getStageGroupsWithCapacity(stage._id);
  // Count teams already granted eligibility for this stage but not yet placed.
  const pending = await TournamentRegistration.countDocuments({
    tournament: t._id,
    eligibleStage: t.currentStage,
    $expr: { $gt: ["$eligibleStage", "$placedStage"] },
  });
  if (vipRemaining - pending <= 0) {
    throw new ApiError(409, "Bu bosqich uchun VIP slot qolmadi");
  }

  const reg = await TournamentRegistration.findOne({
    _id: registrationId,
    tournament: t._id,
    status: REGISTRATION_STATUS.REGISTERED,
  });
  if (!reg) throw new ApiError(404, "Komanda topilmadi");
  if (reg.eligibleStage >= t.currentStage) {
    throw new ApiError(409, "Bu komanda allaqachon keyingi bosqichga o'tgan");
  }

  reg.eligibleStage = t.currentStage;
  reg.nextPlacementKind = TEAM_PLACEMENT_KIND.VIP;
  await reg.save();

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

// Secret group: the leader must join it before registering. Both the invite url and
// the numeric chatId are required; the admin reads the chatId via the bot's /id command.
export const setSecretGroup = async (id, body) => {
  const t = await getRawById(id);
  t.secretGroup = {
    url: body.url.trim(),
    chatId: body.chatId.trim(),
    title: body.title?.trim() || "",
    resolvedAt: new Date(),
  };
  await t.save();
  return withStages(t);
};

export const clearSecretGroup = async (id) => {
  const t = await getRawById(id);
  t.secretGroup = {};
  await t.save();
  return withStages(t);
};
