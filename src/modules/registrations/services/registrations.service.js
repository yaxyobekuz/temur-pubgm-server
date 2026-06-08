import TournamentRegistration, {
  REGISTRATION_STATUS,
  ROSTER_SLOT,
} from "../../../models/tournamentRegistration.model.js";
import Tournament from "../../../models/tournament.model.js";
import Team from "../../../models/team.model.js";
import User from "../../../models/user.model.js";
import ApiError from "../../../utils/ApiError.js";
import {
  TOURNAMENT_STATUS,
  ACTIVE_TOURNAMENT_STATUSES,
  MODE_ROSTER_SIZE,
  TEAM_PLACEMENT_KIND,
} from "../../../constants/tournament.js";
import * as botClient from "../../../services/botClient.service.js";
import * as notify from "../../../services/notify.service.js";
import { ensureSecretGroupMembership } from "../../../services/secretGroup.service.js";
import { getTelegramChannelIdentifier } from "../../../utils/telegram.js";
import { formatDateUz } from "../../../utils/dateUz.js";
import * as stagesService from "../../stages/services/stages.service.js";
import * as groupsService from "../../groups/services/groups.service.js";

// Active = a registration the team is currently committed to.
// Used by Phase 3 locks (team kick/leave, role swap, second registration).
export const findActiveRegistration = async (teamId) => {
  const candidates = await TournamentRegistration.find({
    team: teamId,
    status: REGISTRATION_STATUS.REGISTERED,
  })
    .populate("tournament", "title status");
  return candidates.find(
    (r) => r.tournament && ACTIVE_TOURNAMENT_STATUSES.includes(r.tournament.status),
  ) || null;
};

// Returns true if `userId` is locked as a main player in any active registration.
export const isUserLockedByActiveTournament = async (userId) => {
  const regs = await TournamentRegistration.find({
    status: REGISTRATION_STATUS.REGISTERED,
    "roster.user": userId,
    "roster.slot": ROSTER_SLOT.MAIN,
  }).populate("tournament", "status");
  return regs.some(
    (r) => r.tournament && ACTIVE_TOURNAMENT_STATUSES.includes(r.tournament.status),
  );
};

// Returns true if `teamId` has any active registration (regardless of roster).
export const isTeamLockedByActiveTournament = async (teamId) => {
  return !!(await findActiveRegistration(teamId));
};

const validateRoster = async ({ roster, team, mode }) => {
  if (!Array.isArray(roster) || !roster.length) {
    throw new ApiError(400, "Roster bo'sh bo'lishi mumkin emas");
  }
  const requiredMain = MODE_ROSTER_SIZE[mode];
  if (!requiredMain) throw new ApiError(400, "Turnir rejimi noto'g'ri");

  const mainCount = roster.filter((r) => r.slot === ROSTER_SLOT.MAIN).length;
  if (mainCount !== requiredMain) {
    throw new ApiError(
      400,
      `Bu rejim uchun aynan ${requiredMain} ta asosiy o'yinchi kerak`,
    );
  }

  const memberIds = new Set(team.members.map((m) => String(m)));
  const seen = new Set();
  for (const entry of roster) {
    if (!memberIds.has(String(entry.user))) {
      throw new ApiError(400, "Roster faqat komanda a'zolaridan iborat bo'lishi mumkin");
    }
    const key = String(entry.user);
    if (seen.has(key)) {
      throw new ApiError(400, "Bitta o'yinchi rosterda ikki marta bo'la olmaydi");
    }
    seen.add(key);
  }
};

const memberName = (u) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.tgUsername || "O'yinchi";

// Single source of the sponsor-subscription reminder (initial DM, /start resend, "Mening turnirlarim").
export const buildSponsorReminderMessage = (tournament, channels) => ({
  text:
    `❗ <b>${tournament.title}</b> turniri homiy kanal(lar)iga obuna bo'lmagansiz. ` +
    "Quyidagi kanal(lar)ga obuna bo'ling:\n\n" +
    "⚠️ Diqqat! Homiy kanallardan chiqib ketgan taqdirda, siz va jamoangiz turnirdan chetlatilishingiz mumkin.",
  buttons: channels.map((c) => ({ text: c.title, url: c.url })),
});

// Tournament's Telegram sponsor channels paired with their resolved chat identifier.
const telegramSponsorChannels = (tournament) =>
  (tournament.sponsorChannels || [])
    .filter((c) => c.type === "telegram")
    .map((c) => ({ channel: c, identifier: getTelegramChannelIdentifier(c) }))
    .filter((x) => x.identifier);

// External social channels (YouTube/Instagram/...). Membership can't be verified via the bot,
// so these are NEVER part of the subscription gate - they're only appended to the reminder
// keyboards/buttons for display, alongside the Telegram channels that ARE checked.
export const socialSponsorChannels = (tournament) =>
  (tournament.sponsorChannels || [])
    .filter((c) => c.type === "social")
    .map((c) => ({ title: c.title, url: c.url }));

// Channels a single user is personally not subscribed to (TG only). Read-only: no DM,
// no pending bookkeeping. Throws 503 if the bot is unreachable (the check can't be trusted).
export const getMissingChannelsForUser = async (tournament, user) => {
  const tgChannels = telegramSponsorChannels(tournament);
  if (!tgChannels.length || !user.tgId) return [];
  let map;
  try {
    map = await botClient.checkMembership({
      tgIds: [user.tgId],
      chatIds: tgChannels.map((x) => x.identifier),
    });
  } catch (err) {
    throw new ApiError(503, "Obunani tekshirib bo'lmadi (bot bilan aloqa yo'q)");
  }
  return tgChannels
    .filter(({ identifier }) => map?.[user.tgId]?.[identifier] === false)
    .map(({ channel }) => ({ title: channel.title, url: channel.url }));
};

// DMs each unsubscribed member; if a DM fails (bot blocked), flags the tournament on the user
// so the reminder is resent on their next /start. A delivered DM clears any stale flag.
const notifyAndTrack = async (members, tournament) => {
  for (const m of members) {
    const { text, buttons } = buildSponsorReminderMessage(tournament, m.missing);
    const delivered = await notify.notifyUser({ tgId: m.tgId, text, buttons });
    const op = delivered
      ? { $pull: { pendingSponsorTournaments: tournament._id } }
      : { $addToSet: { pendingSponsorTournaments: tournament._id } };
    await User.updateOne({ _id: m.userId }, op).catch(() => {});
  }
};

// Per-member sponsor-channel check. Returns { ok, channels (union), members:[{userId,tgId,name,missing}] }
// and DMs each unsubscribed member (except the leader, who sees the list in the bot).
// Used both at registration time and for the early team-level check on the register button.
export const evaluateSponsorMembership = async ({ tournament, users, leaderId }) => {
  const tgChannels = telegramSponsorChannels(tournament);
  const tgIds = users.map((u) => u.tgId).filter(Boolean);
  if (!tgChannels.length || !tgIds.length) return { ok: true, channels: [], members: [] };

  let map;
  try {
    map = await botClient.checkMembership({
      tgIds,
      chatIds: tgChannels.map((x) => x.identifier),
    });
  } catch (err) {
    // Bot unreachable - hard-reject (the check can't be trusted); bot must be running.
    throw new ApiError(503, "Obunani tekshirib bo'lmadi (bot bilan aloqa yo'q)");
  }

  const leaderTgId = users.find((u) => String(u._id) === String(leaderId))?.tgId;

  // Per-member missing channels + the union of channels (for the leader's keyboard).
  // Membership is gated on Telegram only; unverifiable social channels are appended for
  // display so a member who must (re)subscribe also sees the YouTube/Instagram links.
  const social = socialSponsorChannels(tournament);
  const members = [];
  const channelByUrl = new Map();
  for (const u of users) {
    const missingTg = tgChannels
      .filter(({ identifier }) => map?.[u.tgId]?.[identifier] === false)
      .map(({ channel }) => ({ title: channel.title, url: channel.url }));
    if (missingTg.length) {
      const missing = [...missingTg, ...social];
      members.push({ userId: u._id, tgId: u.tgId, name: memberName(u), missing });
      for (const c of missing) channelByUrl.set(c.url, c);
    }
  }
  // The leader already sees the names list in the bot, so don't also DM the leader.
  const toNotify = members.filter((m) => String(m.tgId) !== String(leaderTgId));
  if (toNotify.length) await notifyAndTrack(toNotify, tournament);
  return { ok: members.length === 0, channels: [...channelByUrl.values()], members };
};

// /start: resends any sponsor reminders that previously failed to deliver to this user.
// Clears the flag once the reminder is delivered, the user is already subscribed, or the
// tournament is no longer active. Bot still unreachable -> kept for the next attempt.
export const resendPendingSponsorReminders = async (tgId) => {
  const u = await User.findOne(
    { tgId: Number(tgId) },
    "tgId firstName lastName tgUsername pendingSponsorTournaments",
  );
  if (!u?.pendingSponsorTournaments?.length) return { sent: 0 };

  const clear = (tid) =>
    User.updateOne({ _id: u._id }, { $pull: { pendingSponsorTournaments: tid } }).catch(() => {});

  let sent = 0;
  for (const tid of [...u.pendingSponsorTournaments]) {
    const t = await Tournament.findById(tid, "title status sponsorChannels");
    if (!t || ![TOURNAMENT_STATUS.PENDING, TOURNAMENT_STATUS.ONGOING].includes(t.status)) {
      await clear(tid);
      continue;
    }
    let channels;
    try {
      channels = await getMissingChannelsForUser(t, u);
    } catch (err) {
      continue; // bot unreachable - retry on the next /start
    }
    if (!channels.length) {
      await clear(tid); // already subscribed (Telegram); social channels never block
      continue;
    }
    // Show the unverifiable social channels next to the Telegram ones in the reminder.
    const display = [...channels, ...socialSponsorChannels(t)];
    const { text, buttons } = buildSponsorReminderMessage(t, display);
    if (await notify.notifyUser({ tgId: u.tgId, text, buttons })) {
      sent += 1;
      await clear(tid);
    }
  }
  return { sent };
};

export const register = async ({ tournamentId, leaderUser, roster, day, timeSlot }) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Turnir topilmadi");
  if (tournament.status !== TOURNAMENT_STATUS.PENDING) {
    throw new ApiError(400, "Bu turnir hozir ro'yxat qabul qilmaydi");
  }
  if (!day || !timeSlot) {
    throw new ApiError(400, "Kun va vaqtni tanlang");
  }

  // The leader picks a stage-1 day+time slot; the team is auto-placed into a free group there.
  const stage1 = await stagesService.getByTournamentAndOrder(tournament._id, 1);
  if (!stagesService.isScheduleComplete(stage1)) {
    throw new ApiError(400, "Turnir jadvali hali tayyor emas");
  }
  const openGroup = await stagesService.findOpenGroupForSlot(stage1._id, day, timeSlot);
  if (!openGroup) {
    throw new ApiError(409, "Tanlangan kun/vaqt to'lgan, boshqasini tanlang");
  }

  const team = await Team.findOne({ leader: leaderUser._id });
  if (!team) throw new ApiError(404, "Sizning komandangiz topilmadi");

  // One-active rule.
  const existingActive = await findActiveRegistration(team._id);
  if (existingActive) {
    throw new ApiError(409, "Komandangiz allaqachon boshqa turnirda ro'yxatdan o'tgan");
  }

  // Even if a non-active dropped registration exists (kicked/dq), enforce unique (tournament, team).
  const dup = await TournamentRegistration.findOne({ tournament: tournament._id, team: team._id });
  if (dup) throw new ApiError(409, "Bu turnirga allaqachon ariza berilgan");

  // Slot/roster validation.
  await validateRoster({ roster, team, mode: tournament.mode });

  // Sponsor channel membership check (TG only).
  const mainRoster = roster.filter((r) => r.slot === ROSTER_SLOT.MAIN);
  const rosterUserIds = roster.map((r) => r.user);
  const involvedIds = Array.from(new Set([String(leaderUser._id), ...rosterUserIds.map(String)]));
  const users = await User.find(
    { _id: { $in: involvedIds } },
    "tgId firstName lastName tgUsername",
  );
  const tgIds = users.map((u) => u.tgId).filter(Boolean);
  if (tgIds.length !== users.length) {
    throw new ApiError(400, "Barcha o'yinchilar Telegram orqali ro'yxatdan o'tgan bo'lishi kerak");
  }

  const sub = await evaluateSponsorMembership({ tournament, users, leaderId: leaderUser._id });
  if (!sub.ok) {
    throw new ApiError(403, "Ba'zi a'zolar homiy kanallarga obuna emas", {
      details: { channels: sub.channels, members: sub.members.map((m) => ({ name: m.name })) },
    });
  }

  // Secret group: leader-only membership check against the target group (the chosen day/time slot).
  const leaderTgId = users.find((u) => String(u._id) === String(leaderUser._id))?.tgId;
  const sg = await ensureSecretGroupMembership({ group: openGroup, leaderTgId });
  if (!sg.ok) {
    throw new ApiError(403, "Maxfiy guruhga qo'shiling", { details: { secretGroup: sg.group } });
  }

  // Capacity check: tournament-level (Phase 2 maxTeams).
  const currentCount = await TournamentRegistration.countDocuments({
    tournament: tournament._id,
    status: REGISTRATION_STATUS.REGISTERED,
  });
  if (currentCount >= tournament.maxTeams) {
    throw new ApiError(409, "Turnirda joy yo'q");
  }

  const reg = await TournamentRegistration.create({
    tournament: tournament._id,
    team: team._id,
    status: REGISTRATION_STATUS.REGISTERED,
    roster,
    eligibleStage: 1,
    placedStage: 0,
    registeredAt: new Date(),
  });

  // Place into a free group of the chosen slot (re-resolve in case it filled up meanwhile).
  const group =
    (await stagesService.findOpenGroupForSlot(stage1._id, day, timeSlot)) || openGroup;
  try {
    await groupsService.addTeam(group._id, reg._id, TEAM_PLACEMENT_KIND.NORMAL);
  } catch (err) {
    // Slot filled between the check and now - roll the registration back.
    await reg.deleteOne();
    if (err instanceof ApiError && err.statusCode === 409) {
      throw new ApiError(409, "Tanlangan kun/vaqt to'lgan, boshqasini tanlang");
    }
    throw err;
  }
  reg.currentGroup = group._id;
  reg.placedStage = 1;
  await reg.save();

  // Leaderga ro'yxat tasdig'i (guruh + sana/vaqt). Jadval bo'lmasa faqat guruh kodi.
  const slot = stagesService.getScheduleSlot(stage1, day, timeSlot);
  const when = slot?.date
    ? `\nSana: ${formatDateUz(slot.date)}${slot.time ? `, ${slot.time}` : ""}`
    : "";
  await notify.notifyUser({
    tgId: leaderTgId,
    text: `✅ <b>${tournament.title}</b> turniriga ro'yxatdan o'tdingiz.\nGuruh: <b>${group.code}</b>${when}`,
  });

  return reg.populate([
    { path: "team", select: "name tag logo" },
    { path: "roster.user", select: "firstName lastName tgUsername gameNickname" },
    { path: "currentGroup", select: "code day timeSlot" },
  ]);
};

export const listByTournament = async ({ tournamentId, status }) => {
  const filter = { tournament: tournamentId };
  if (status) filter.status = status;
  return TournamentRegistration.find(filter)
    .sort({ registeredAt: 1 })
    .populate("team", "name tag logo leader")
    .populate("roster.user", "firstName lastName tgUsername gameNickname")
    .populate("currentGroup", "code day timeSlot stage");
};

// Returns the team's registrations, each enriched with the concrete date/time label of its
// current group (resolved from the stage schedule) for the bot to display.
export const listByTeam = async (teamId) => {
  const regs = await TournamentRegistration.find({ team: teamId })
    .sort({ registeredAt: -1 })
    .populate("tournament", "title slug status mode startDate currentStage stagesCount")
    .populate("currentGroup", "code day timeSlot stage")
    .lean();

  const stageIds = regs.map((r) => r.currentGroup?.stage).filter(Boolean);
  if (!stageIds.length) return regs;
  const Stage = (await import("../../../models/stage.model.js")).default;
  const stages = await Stage.find({ _id: { $in: stageIds } }, "schedule").lean();
  const byStage = new Map(stages.map((s) => [String(s._id), s]));

  for (const r of regs) {
    const g = r.currentGroup;
    if (!g?.stage) continue;
    const stage = byStage.get(String(g.stage));
    const sd = (stage?.schedule || []).find((x) => x.day === g.day);
    const st = sd?.timeSlots?.find((x) => x.timeSlot === g.timeSlot);
    g.date = sd?.date || null;
    g.time = st?.time || "";
  }
  return regs;
};

export const getById = async (id) => {
  const r = await TournamentRegistration.findById(id)
    .populate("tournament", "title status")
    .populate("team", "name tag logo leader")
    .populate("roster.user", "firstName lastName tgUsername gameNickname");
  if (!r) throw new ApiError(404, "Ro'yxat topilmadi");
  return r;
};

export const kick = async (id) => {
  const r = await getById(id);
  if (r.status === REGISTRATION_STATUS.KICKED) return r;
  r.status = REGISTRATION_STATUS.KICKED;
  await r.save();

  // Leaderga diskvalifikatsiya xabari.
  const leader = await notify.resolveRecipient(r.team?.leader);
  if (leader) {
    await notify.notifyUser({
      tgId: leader.tgId,
      text: `⚠️ Komandangiz <b>${r.tournament?.title || "turnir"}</b> turniridan chiqarildi.`,
    });
  }
  return r;
};

// Undo a kick: bring a kicked team back into the tournament.
export const restore = async (id) => {
  const r = await getById(id);
  if (r.status === REGISTRATION_STATUS.REGISTERED) return r;
  // Enforce the one-active rule: the team must not be committed elsewhere.
  const teamId = r.team?._id || r.team;
  const existingActive = await findActiveRegistration(teamId);
  if (existingActive && String(existingActive._id) !== String(r._id)) {
    throw new ApiError(409, "Komanda allaqachon boshqa turnirda ro'yxatdan o'tgan");
  }
  r.status = REGISTRATION_STATUS.REGISTERED;
  await r.save();

  // Leaderga qayta tiklash xabari.
  const leader = await notify.resolveRecipient(r.team?.leader);
  if (leader) {
    await notify.notifyUser({
      tgId: leader.tgId,
      text: `✅ Komandangiz <b>${r.tournament?.title || "turnir"}</b> turniriga qaytarildi.`,
    });
  }
  return r;
};

export const setGroup = async (id, groupId) => {
  const r = await getById(id);
  r.currentGroup = groupId || null;
  await r.save();
  return r;
};

// The leader's team registration that has been advanced/VIP-invited to a stage it has not
// yet picked a slot for (eligibleStage > placedStage), plus the open slots of that stage.
export const getPendingPlacement = async (leaderUser) => {
  const team = await Team.findOne({ leader: leaderUser._id }).populate(
    "members",
    "firstName lastName tgUsername",
  );
  if (!team) return null;
  const reg = await TournamentRegistration.findOne({
    team: team._id,
    status: REGISTRATION_STATUS.REGISTERED,
    $expr: { $gt: ["$eligibleStage", "$placedStage"] },
  }).populate("tournament", "title status stagesCount mode");
  if (!reg) return null;

  const stage = await stagesService.getByTournamentAndOrder(
    reg.tournament._id,
    reg.eligibleStage,
  );
  const scheduleReady = stagesService.isScheduleComplete(stage);
  // If the next stage's schedule is not set yet, surface no slots (the bot shows a notice).
  const openSlots = scheduleReady ? await stagesService.listOpenSlots(stage._id) : { days: [] };
  // VIP team granted a slot before ever registering has no roster yet - the bot must ask for it.
  const needsRoster = !reg.roster?.length;
  return {
    registrationId: String(reg._id),
    tournament: { _id: reg.tournament._id, title: reg.tournament.title },
    stageOrder: reg.eligibleStage,
    stagesCount: reg.tournament.stagesCount,
    kind: reg.nextPlacementKind,
    scheduleReady,
    openSlots,
    needsRoster,
    mode: reg.tournament.mode,
    members: needsRoster
      ? (team.members || []).map((m) => ({
          _id: String(m._id),
          firstName: m.firstName,
          lastName: m.lastName,
          tgUsername: m.tgUsername,
        }))
      : [],
  };
};

// Place an advanced/VIP team into a chosen day+time slot of its eligible (next) stage.
// `roster` is required only for a brand-new VIP team whose registration has no roster yet.
export const placeIntoStage = async ({ leaderUser, registrationId, day, timeSlot, roster }) => {
  const team = await Team.findOne({ leader: leaderUser._id });
  if (!team) throw new ApiError(404, "Sizning komandangiz topilmadi");

  const reg = await TournamentRegistration.findOne({
    _id: registrationId,
    team: team._id,
    status: REGISTRATION_STATUS.REGISTERED,
  });
  if (!reg) throw new ApiError(404, "Ro'yxat topilmadi");
  if (reg.eligibleStage <= reg.placedStage) {
    throw new ApiError(400, "Bu bosqich uchun joy tanlash kerak emas");
  }
  if (!day || !timeSlot) throw new ApiError(400, "Kun va vaqtni tanlang");

  // VIP team without a roster yet: the leader sends it now. Existing roster -> ignore input.
  if (!reg.roster?.length) {
    if (!roster?.length) throw new ApiError(400, "Avval asosiy o'yinchilarni tanlang");
    const tournament = await Tournament.findById(reg.tournament, "mode");
    await validateRoster({ roster, team, mode: tournament.mode });
    reg.roster = roster;
  }

  const stage = await stagesService.getByTournamentAndOrder(reg.tournament, reg.eligibleStage);
  if (!stagesService.isScheduleComplete(stage)) {
    throw new ApiError(400, "Bu bosqich jadvali hali tayyor emas");
  }
  const openGroup = await stagesService.findOpenGroupForSlot(stage._id, day, timeSlot);
  if (!openGroup) {
    throw new ApiError(409, "Tanlangan kun/vaqt to'lgan, boshqasini tanlang");
  }

  // Secret group: leader must join the chosen group's private group before being placed.
  const leaderTgId =
    leaderUser.tgId || (await User.findById(leaderUser._id, "tgId"))?.tgId;
  const sg = await ensureSecretGroupMembership({ group: openGroup, leaderTgId });
  if (!sg.ok) {
    throw new ApiError(403, "Maxfiy guruhga qo'shiling", { details: { secretGroup: sg.group } });
  }

  const kind =
    reg.nextPlacementKind === TEAM_PLACEMENT_KIND.NORMAL
      ? TEAM_PLACEMENT_KIND.ADVANCED
      : reg.nextPlacementKind;
  await groupsService.addTeam(openGroup._id, reg._id, kind);

  reg.currentGroup = openGroup._id;
  reg.placedStage = reg.eligibleStage;
  reg.nextPlacementKind = TEAM_PLACEMENT_KIND.NORMAL;
  await reg.save();

  return reg.populate({ path: "currentGroup", select: "code day timeSlot" });
};
