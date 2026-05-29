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
} from "../../../constants/tournament.js";
import * as botClient from "../../../services/botClient.service.js";
import { getTelegramChannelIdentifier } from "../../../utils/telegram.js";

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

const ensureSponsorMembership = async ({ tournament, tgIds }) => {
  const tgChannels = (tournament.sponsorChannels || [])
    .filter((c) => c.type === "telegram")
    .map((c) => ({ channel: c, identifier: getTelegramChannelIdentifier(c) }))
    .filter((x) => x.identifier);
  if (!tgChannels.length || !tgIds.length) return { ok: true, missing: [] };

  try {
    const map = await botClient.checkMembership({
      tgIds,
      chatIds: tgChannels.map((x) => x.identifier),
    });

    const missing = [];
    for (const { channel, identifier } of tgChannels) {
      const notSubscribed = tgIds.some((tg) => map?.[tg]?.[identifier] === false);
      if (notSubscribed) missing.push({ title: channel.title, url: channel.url });
    }
    return { ok: missing.length === 0, missing };
  } catch (err) {
    // If the bot is unreachable, fail open with a soft warning rather than block all registrations.
    // The Phase 3 plan calls for hard-reject on missing subs but the bot must be running.
    throw new ApiError(503, "Obunani tekshirib bo'lmadi (bot bilan aloqa yo'q)");
  }
};

export const register = async ({ tournamentId, leaderUser, roster }) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new ApiError(404, "Turnir topilmadi");
  if (tournament.status !== TOURNAMENT_STATUS.PENDING) {
    throw new ApiError(400, "Bu turnir hozir ro'yxat qabul qilmaydi");
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
  const users = await User.find({ _id: { $in: involvedIds } }, "tgId");
  const tgIds = users.map((u) => u.tgId).filter(Boolean);
  if (tgIds.length !== users.length) {
    throw new ApiError(400, "Barcha o'yinchilar Telegram orqali ro'yxatdan o'tgan bo'lishi kerak");
  }

  const sub = await ensureSponsorMembership({ tournament, tgIds });
  if (!sub.ok) {
    throw new ApiError(403, "Quyidagi kanallarga obuna bo'ling", { details: sub.missing });
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
    registeredAt: new Date(),
  });
  return reg.populate([
    { path: "team", select: "name logo" },
    { path: "roster.user", select: "firstName lastName tgUsername gameNickname" },
  ]);
};

export const listByTournament = async ({ tournamentId, status }) => {
  const filter = { tournament: tournamentId };
  if (status) filter.status = status;
  return TournamentRegistration.find(filter)
    .sort({ registeredAt: 1 })
    .populate("team", "name logo leader")
    .populate("roster.user", "firstName lastName tgUsername gameNickname")
    .populate("currentGroup", "code");
};

export const listByTeam = async (teamId) => {
  return TournamentRegistration.find({ team: teamId })
    .sort({ registeredAt: -1 })
    .populate("tournament", "title slug status mode startDate");
};

export const getById = async (id) => {
  const r = await TournamentRegistration.findById(id)
    .populate("tournament", "title status")
    .populate("team", "name logo leader")
    .populate("roster.user", "firstName lastName tgUsername gameNickname");
  if (!r) throw new ApiError(404, "Ro'yxat topilmadi");
  return r;
};

export const kick = async (id) => {
  const r = await getById(id);
  if (r.status === REGISTRATION_STATUS.KICKED) return r;
  r.status = REGISTRATION_STATUS.KICKED;
  await r.save();
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
  return r;
};

export const setGroup = async (id, groupId) => {
  const r = await getById(id);
  r.currentGroup = groupId || null;
  await r.save();
  return r;
};
