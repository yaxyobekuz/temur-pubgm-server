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
import * as notify from "../../../services/notify.service.js";

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

// Replace team.logo (and its Telegram file_id cache), deleting the old file if it changed.
// fileId defaults to "" so a web-panel logo change invalidates the stale cache and the bot re-caches.
const swapLogo = async (team, nextLogo, nextFileId = "") => {
  const next = (nextLogo || "").trim();
  if (next === team.logo) {
    if (nextFileId) team.logoFileId = nextFileId.trim();
    return;
  }
  const old = team.logo;
  team.logo = next;
  team.logoFileId = (nextFileId || "").trim();
  if (old) await deleteUploadByUrl(old);
};

export const adminUpdate = async (id, body) => {
  const team = await getById(id);
  if (body.name !== undefined) team.name = body.name.trim();
  if (body.tag !== undefined) team.tag = body.tag.trim();
  if (body.logo !== undefined) await swapLogo(team, body.logo, body.logoFileId);
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
    tag: body.tag?.trim() || "",
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
  if (body.tag !== undefined) team.tag = body.tag.trim();
  if (body.logo !== undefined) await swapLogo(team, body.logo, body.logoFileId);
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

  // Chiqarilgan a'zoga xabar.
  const kicked = await notify.resolveRecipient(memberId);
  if (kicked) {
    await notify.notifyUser({
      tgId: kicked.tgId,
      text: `⚠️ Siz <b>${team.name}</b> komandasidan chiqarildingiz.`,
    });
  }
  return team;
};

export const leave = async (user) => {
  const team = await Team.findOne({ members: user._id, leader: { $ne: user._id } });
  if (!team) throw new ApiError(404, "Siz hech qanday komandada emassiz");
  await assertNotLockedByTournament(team._id, user._id);
  team.members = team.members.filter((m) => String(m) !== String(user._id));
  await team.save();

  // Leaderga xabar (chiquvchi - acting user).
  const leader = await notify.resolveRecipient(team.leader);
  if (leader) {
    await notify.notifyUser({
      tgId: leader.tgId,
      text: `ℹ️ <b>${notify.displayName(user)}</b> komandangizdan chiqdi.`,
    });
  }
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
  // A player may still lead their own (parked) team - that membership must NOT block joining
  // another team to play, so only a *non-owned* team counts as "boshqa komanda".
  const inAnother = await Team.findOne({ members: user._id, leader: { $ne: user._id } });
  if (inAnother) throw new ApiError(409, "Siz boshqa komandadasiz");
  if (team.members.length >= TEAM_MEMBERS_MAX) {
    throw new ApiError(409, "Komanda to'la");
  }

  // Ensure the player is an active member of exactly one team: drop their own parked team's
  // membership (no-op if already parked at role switch; also self-heals pre-existing data).
  await parkOwnTeam(user._id);

  team.members.push(user._id);
  await team.save();

  // Leaderga xabar (yangi a'zo qo'shildi). Qo'shilgan a'zoga tasdiq botning o'zi (start deep-link)
  // darhol javob qaytaradi, shuning uchun bu yerda unga alohida xabar yuborilmaydi (takror bo'lmasin).
  const leader = await notify.resolveRecipient(team.leader);
  if (leader) {
    await notify.notifyUser({
      tgId: leader.tgId,
      text: `✅ <b>${notify.displayName(user)}</b> komandangizga qo'shildi.`,
    });
  }
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

// "Park" the user's own team: drop their membership while keeping the team document and the
// `leader` reference intact. Used when a leader downgrades to `player` so they're free to join
// another team and play; rejoinOwnTeam restores them when they switch back to leader.
export const parkOwnTeam = async (userId, { session } = {}) => {
  await Team.updateMany(
    { leader: userId },
    { $pull: { members: userId } },
    session ? { session } : undefined,
  );
};

// Re-add the user to the team they lead (reverse of parkOwnTeam). Used on `player` → `leader`.
// $addToSet keeps it idempotent if they somehow still appear in the member list.
export const rejoinOwnTeam = async (userId, { session } = {}) => {
  await Team.updateMany(
    { leader: userId },
    { $addToSet: { members: userId } },
    session ? { session } : undefined,
  );
};

export { buildInviteCode };
