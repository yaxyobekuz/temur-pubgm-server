import mongoose from "mongoose";
import Team, { TEAM_MEMBERS_MAX } from "../../../models/team.model.js";
import User from "../../../models/user.model.js";
import ApiError from "../../../utils/ApiError.js";
import { ROLES } from "../../../constants/roles.js";
import { deleteUploadByUrl } from "../../../utils/uploadFile.js";
import {
  isTeamLockedByActiveTournament,
  isUserLockedByActiveTournament,
} from "../../registrations/services/registrations.service.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildInviteCode = (leaderId) => `team_${leaderId.toString()}`;

// Phase 3 lock: deny kick/leave if the user is on an active tournament's main roster.
const assertNotLockedByTournament = async (_teamId, userId) => {
  const locked = await isUserLockedByActiveTournament(userId);
  if (locked) {
    throw new ApiError(
      409,
      "O'yinchi faol turnirning asosiy ro'yxatida - turnir tugamaguncha chiqarib bo'lmaydi",
    );
  }
};

export const list = async ({ search, isActive, page = 1, limit = 20 }) => {
  const filter = {};
  if (typeof isActive === "boolean") filter.isActive = isActive;
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: rx }, { inviteCode: rx }];
  }
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Team.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("leader", "firstName lastName username tgUsername gameNickname")
      .populate("members", "firstName lastName username tgUsername gameNickname"),
    Team.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

export const getById = async (id) => {
  const team = await Team.findById(id)
    .populate("leader", "firstName lastName username tgUsername gameNickname")
    .populate("members", "firstName lastName username tgUsername gameNickname");
  if (!team) throw new ApiError(404, "Komanda topilmadi");
  return team;
};

export const getByInviteCode = async (code) => {
  return Team.findOne({ inviteCode: String(code).trim().toLowerCase() });
};

export const getMyTeam = async (userId) => {
  // Single team the user is part of (as leader or member).
  return Team.findOne({ members: userId })
    .populate("leader", "firstName lastName username tgUsername gameNickname")
    .populate("members", "firstName lastName username tgUsername gameNickname");
};

// Replace team.logo, deleting the previously stored file if it changed.
const swapLogo = async (team, nextLogo) => {
  const next = (nextLogo || "").trim();
  if (next === team.logo) return;
  const old = team.logo;
  team.logo = next;
  if (old) await deleteUploadByUrl(old);
};

export const adminUpdate = async (id, body) => {
  const team = await getById(id);
  if (body.name !== undefined) team.name = body.name.trim();
  if (body.logo !== undefined) await swapLogo(team, body.logo);
  if (body.isActive !== undefined) team.isActive = !!body.isActive;
  await team.save();
  return team;
};

export const adminRemove = async (id) => {
  const team = await Team.findById(id);
  if (!team) throw new ApiError(404, "Komanda topilmadi");
  const oldLogo = team.logo;
  await team.deleteOne();
  if (oldLogo) await deleteUploadByUrl(oldLogo);
};

export const createForLeader = async (leaderUser, body) => {
  if (leaderUser.role !== ROLES.LEADER) {
    throw new ApiError(403, "Faqat leader komandasini yarata oladi");
  }
  const existing = await Team.findOne({ leader: leaderUser._id });
  if (existing) throw new ApiError(409, "Sizning komandangiz allaqachon mavjud");
  const alreadyMember = await Team.findOne({ members: leaderUser._id });
  if (alreadyMember) {
    throw new ApiError(409, "Siz boshqa komandadasiz, avval undan chiqing");
  }

  const team = await Team.create({
    name: body.name.trim(),
    logo: body.logo?.trim() || "",
    leader: leaderUser._id,
    members: [leaderUser._id],
    inviteCode: buildInviteCode(leaderUser._id),
    isActive: true,
  });
  return team;
};

export const updateOwn = async (leaderUser, body) => {
  const team = await Team.findOne({ leader: leaderUser._id });
  if (!team) throw new ApiError(404, "Sizning komandangiz topilmadi");
  if (body.name !== undefined) team.name = body.name.trim();
  if (body.logo !== undefined) await swapLogo(team, body.logo);
  await team.save();
  return team;
};

export const regenerateInvite = async (leaderUser) => {
  const team = await Team.findOne({ leader: leaderUser._id });
  if (!team) throw new ApiError(404, "Sizning komandangiz topilmadi");
  // Keep the deterministic form so deep-links remain shareable; bump the timestamp for revoke semantics.
  const suffix = Date.now().toString(36);
  team.inviteCode = `${buildInviteCode(leaderUser._id)}_${suffix}`;
  await team.save();
  return team;
};

export const kickMember = async (leaderUser, memberId) => {
  const team = await Team.findOne({ leader: leaderUser._id });
  if (!team) throw new ApiError(404, "Sizning komandangiz topilmadi");
  if (String(memberId) === String(leaderUser._id)) {
    throw new ApiError(400, "Leader o'zini chiqarib yubora olmaydi");
  }
  if (!team.members.some((m) => String(m) === String(memberId))) {
    throw new ApiError(404, "Bu foydalanuvchi komandangizda emas");
  }
  await assertNotLockedByTournament(team._id, memberId);

  team.members = team.members.filter((m) => String(m) !== String(memberId));
  await team.save();
  return team;
};

export const leave = async (user) => {
  const team = await Team.findOne({ members: user._id, leader: { $ne: user._id } });
  if (!team) throw new ApiError(404, "Siz hech qanday komandada emassiz");
  await assertNotLockedByTournament(team._id, user._id);
  team.members = team.members.filter((m) => String(m) !== String(user._id));
  await team.save();
  return team;
};

export const acceptInvite = async (user, inviteCode) => {
  const code = String(inviteCode || "").trim().toLowerCase();
  if (!code.startsWith("team_")) throw new ApiError(400, "Taklif kodi noto'g'ri");

  const team = await Team.findOne({ inviteCode: code });
  if (!team) throw new ApiError(404, "Taklif kodi topilmadi yoki bekor qilingan");
  if (!team.isActive) throw new ApiError(409, "Komanda faol emas");

  if (String(team.leader) === String(user._id)) {
    throw new ApiError(409, "Siz allaqachon ushbu komanda sardorisiz");
  }
  if (user.role !== ROLES.PLAYER) {
    throw new ApiError(403, "Faqat player komandaga qo'shila oladi");
  }
  if (team.members.some((m) => String(m) === String(user._id))) {
    throw new ApiError(409, "Siz allaqachon ushbu komandadasiz");
  }
  const inAnother = await Team.findOne({ members: user._id });
  if (inAnother) throw new ApiError(409, "Siz boshqa komandadasiz");
  if (team.members.length >= TEAM_MEMBERS_MAX) {
    throw new ApiError(409, "Komanda to'la");
  }

  team.members.push(user._id);
  await team.save();
  return team;
};

// Detach the user from any team where they are a non-leader member.
// Used when switching role from `player` → `leader`.
export const detachFromAllTeams = async (userId, { session } = {}) => {
  await Team.updateMany(
    { members: userId, leader: { $ne: userId } },
    { $pull: { members: userId } },
    session ? { session } : undefined,
  );
};

export { buildInviteCode };
