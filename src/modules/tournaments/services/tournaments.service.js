import Tournament from "../../../models/tournament.model.js";
import Stage from "../../../models/stage.model.js";
import Group from "../../../models/group.model.js";
import HelpLink from "../../../models/helpLink.model.js";
import Team from "../../../models/team.model.js";
import * as settingsService from "../../settings/services/settings.service.js";
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
  TEAM_PLACEMENT_KIND,
  getStageBlueprint,
  getStageLabel,
} from "../../../constants/tournament.js";
import { BROADCAST_TARGET } from "../../../models/broadcastJob.model.js";
import * as stagesService from "../../stages/services/stages.service.js";
import * as groupsService from "../../groups/services/groups.service.js";
import * as notify from "../../../services/notify.service.js";
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

// Creates the stages (each with its materialized config) and builds the full group skeleton
// for EVERY stage so the admin can pre-configure each group's secret group before the
// tournament starts (leaders also pick a stage-1 slot during the pending registration phase).
const createStagesForTournament = async (tournamentId, count) => {
  const docs = Array.from({ length: count }, (_, i) => ({
    tournament: tournamentId,
    order: i + 1,
    config: getStageBlueprint(i + 1, count),
  }));
  const stages = await Stage.insertMany(docs);
  for (const s of stages) await stagesService.buildSkeleton(s);
  return stages;
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
  // Turnir har doim ruxsat etilgan bosqich strukturasidan iborat (default 3, oxirgisi - Final).
  const stagesCount = DEFAULT_STAGES_COUNT;
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
  if (body.banner !== undefined) {
    const next = body.banner.trim();
    if (next !== t.banner) t.bannerFileId = ""; // banner changed -> drop the stale Telegram cache
    t.banner = next;
  }
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

// Resolves the admin contact link for VIP requests from the global panel settings (single source
// of truth - the VIP admin username on the Settings page), falling back to the first active help
// link when it is unset.
const resolveAdminContactUrl = async () => {
  const vipUrl = await settingsService.getVipAdminUrl();
  if (vipUrl) return vipUrl;
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
    const url = await resolveAdminContactUrl();
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

// Berilgan registratsiyalar leaderlariga matnli DM (matn `(name) => text` orqali, per-leader).
// promote (o'tgan komandalar) va final (g'oliblar) ikkalasi ishlatadi - N+1 dan qochish uchun batch.
const dmRegistrationLeaders = async (regIds, makeText) => {
  if (!regIds.length) return;
  const regs = await TournamentRegistration.find({ _id: { $in: regIds } }, "team").lean();
  const teams = await Team.find({ _id: { $in: regs.map((r) => r.team) } }, "leader").lean();
  const teamLeader = new Map(teams.map((t) => [String(t._id), t.leader]));
  const recipients = await notify.resolveRecipients(teams.map((t) => t.leader));
  for (const reg of regs) {
    const leaderId = teamLeader.get(String(reg.team));
    const rec = recipients.get(String(leaderId));
    if (rec) await notify.notifyUser({ tgId: rec.tgId, text: makeText(reg, rec) });
  }
};

// Barcha komanda a'zolariga bir xil matnli DM (best-effort).
const notifyTeamMembers = async (teamId, text) => {
  const team = await Team.findById(teamId, "members").lean();
  if (!team?.members?.length) return;
  const recipients = await notify.resolveRecipients(team.members);
  for (const rec of recipients.values()) {
    await notify.notifyUser({ tgId: rec.tgId, text });
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

  // O'tgan komandalar leaderlariga maqsadli tabrik (umumiy broadcast'ga qo'shimcha).
  const stageLabel = getStageLabel(nextOrder, t.stagesCount);
  await dmRegistrationLeaders(
    advancingIds,
    () => `🎉 Tabriklaymiz! Siz <b>${stageLabel}</b> bosqichiga o'tdingiz. Bot orqali kun va vaqtni tanlang.`,
  );

  return withStages(t);
};

// Open a VIP slot: admin grants ANY team (even one not registered) eligibility for ANY stage.
// A new registration is created if the team has none. The team then picks its roster + a
// day/time slot via the bot (no sponsor-channel requirement; secret group still mandatory).
// Enforces remaining capacity of the chosen stage.
export const openVipSlot = async (id, { teamId, stageOrder }, currentUser) => {
  const t = await getRawById(id);
  // Allowed while open for registration (PENDING) or in progress (ONGOING); not DRAFT/FINISHED.
  if (t.status !== TOURNAMENT_STATUS.PENDING && t.status !== TOURNAMENT_STATUS.ONGOING) {
    throw new ApiError(400, "Bu turnirga komanda qo'shib bo'lmaydi");
  }
  // Stage is auto-resolved: registration phase -> stage 1, in progress -> the current stage.
  const resolvedStage =
    stageOrder ?? (t.status === TOURNAMENT_STATUS.PENDING ? 1 : t.currentStage);
  if (!Number.isInteger(resolvedStage) || resolvedStage < 1 || resolvedStage > t.stagesCount) {
    throw new ApiError(400, "Noto'g'ri bosqich");
  }

  const team = await Team.findById(teamId, "members");
  if (!team) throw new ApiError(404, "Komanda topilmadi");

  // Ensure the chosen stage's group skeleton exists (idempotent) - needed when granting a VIP
  // slot for a future stage that hasn't been built yet.
  const stage = await stagesService.getByTournamentAndOrder(t._id, resolvedStage);
  await stagesService.buildSkeleton(stage);

  // Capacity of the chosen stage: placed teams + teams already pending placement into it.
  const { vipRemaining } = await groupsService.getStageGroupsWithCapacity(stage._id);
  const pending = await TournamentRegistration.countDocuments({
    tournament: t._id,
    eligibleStage: resolvedStage,
    $expr: { $gt: ["$eligibleStage", "$placedStage"] },
  });
  if (vipRemaining - pending <= 0) {
    throw new ApiError(409, "Bu bosqich uchun VIP slot qolmadi");
  }

  let reg = await TournamentRegistration.findOne({ tournament: t._id, team: teamId });
  if (reg) {
    if (reg.status !== REGISTRATION_STATUS.REGISTERED) {
      throw new ApiError(409, "Bu komanda turnirdan chiqarilgan, avval qaytaring");
    }
    if (reg.placedStage >= resolvedStage) {
      throw new ApiError(409, "Bu komanda allaqachon shu bosqichda o'ynayapti");
    }
    if (reg.eligibleStage >= resolvedStage && reg.eligibleStage > reg.placedStage) {
      throw new ApiError(409, "Bu komanda allaqachon shu bosqichga joy tanlamoqda");
    }
    reg.eligibleStage = resolvedStage;
    reg.nextPlacementKind = TEAM_PLACEMENT_KIND.VIP;
    await reg.save();
  } else {
    // Brand-new VIP team: no roster yet - the leader picks it in the bot before placement.
    reg = await TournamentRegistration.create({
      tournament: t._id,
      team: teamId,
      status: REGISTRATION_STATUS.REGISTERED,
      roster: [],
      eligibleStage: resolvedStage,
      placedStage: 0,
      nextPlacementKind: TEAM_PLACEMENT_KIND.VIP,
      registeredAt: new Date(),
    });
  }

  // Barcha komanda a'zolariga VIP slot xabari.
  const stageLabel = getStageLabel(resolvedStage, t.stagesCount);
  await notifyTeamMembers(
    teamId,
    `🎟 Sizga <b>${stageLabel}</b> uchun VIP slot berildi! Bot orqali asosiy o'yinchilar va kun/vaqtni tanlang.\n\n⚠️ Joy tanlaganingizda o'sha guruhning <b>maxfiy guruhiga</b> qo'shilishingiz shart - aks holda turnirda qatnasha olmaysiz.`,
  );

  return withStages(t);
};

// Final bosqich natijasi: admin 1/2/3-o'rinni qayd etadi. Natija guruh team yozuviga DOIMIY
// saqlanadi (group.teams[].placement). Turnir statusiga tegmaydi - g'oliblarga tabrik DM yuboradi.
// Idempotent: qayta yuborilsa final guruh o'rinlari avval tozalanib, qaytadan yoziladi.
export const recordFinalPlacements = async (id, placements, currentUser) => {
  const t = await getRawById(id);
  if (t.currentStage !== t.stagesCount) {
    throw new ApiError(400, "Faqat final bosqichida natija qayd etiladi");
  }
  if (!Array.isArray(placements) || !placements.length) {
    throw new ApiError(400, "O'rinlarni tanlang");
  }
  const places = new Set();
  const regIds = new Set();
  for (const p of placements) {
    if (p.place < 1 || p.place > 3) throw new ApiError(400, "O'rin 1..3 oralig'ida bo'lishi kerak");
    if (places.has(p.place)) throw new ApiError(400, "O'rin takrorlanmasligi kerak");
    if (regIds.has(String(p.registrationId))) {
      throw new ApiError(400, "Komanda takrorlanmasligi kerak");
    }
    places.add(p.place);
    regIds.add(String(p.registrationId));
  }

  const stage = await stagesService.getByTournamentAndOrder(t._id, t.stagesCount);
  const groups = await Group.find({ stage: stage._id });
  // registrationId -> { group, team subdoc }
  const byReg = new Map();
  for (const g of groups) {
    for (const tm of g.teams) byReg.set(String(tm.registration), { group: g, team: tm });
  }
  for (const p of placements) {
    if (!byReg.has(String(p.registrationId))) {
      throw new ApiError(404, "Komanda final guruhida emas");
    }
  }

  // Overwrite: avval shu guruh(lar)dagi barcha o'rinlarni tozalab, keyin yozamiz.
  const touched = new Set();
  for (const g of groups) {
    for (const tm of g.teams) tm.placement = null;
    touched.add(g);
  }
  for (const p of placements) {
    byReg.get(String(p.registrationId)).team.placement = p.place;
  }
  for (const g of touched) {
    g.markModified("teams");
    await g.save();
  }

  // G'oliblarga tabrik (best-effort).
  const placeByReg = new Map(placements.map((p) => [String(p.registrationId), p.place]));
  await dmRegistrationLeaders(
    placements.map((p) => p.registrationId),
    (reg) => `🏆 Tabriklaymiz! Siz <b>${placeByReg.get(String(reg._id))}-o'rin</b>ni egallabdingiz!`,
  );

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
