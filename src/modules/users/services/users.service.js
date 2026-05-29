import User from "../../../models/user.model.js";
import Role from "../../../models/role.model.js";
import Team from "../../../models/team.model.js";
import ApiError from "../../../utils/ApiError.js";
import { ROLES, SELF_SWITCHABLE_ROLES } from "../../../constants/roles.js";
import { normalizePhone } from "../../../utils/phone.js";
import { hashPassword, comparePassword } from "../../../helpers/password.helper.js";
import * as teamsService from "../../teams/services/teams.service.js";
import {
  findActiveRegistration,
  isUserLockedByActiveTournament,
} from "../../registrations/services/registrations.service.js";

export const list = async ({ role, search, page = 1, limit = 20 }) => {
  const filter = {};
  if (role) filter.role = role;

  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [
      { firstName: rx },
      { lastName: rx },
      { username: rx },
      { phone: rx },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { items, total, page, limit };
};

export const getById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "Foydalanuvchi topilmadi");
  return user;
};

export const update = async (id, body) => {
  const user = await getById(id);
  if (user.role === ROLES.OWNER) {
    throw new ApiError(403, "Owner foydalanuvchini tahrirlab bo'lmaydi");
  }

  if (body.firstName !== undefined) user.firstName = body.firstName.trim();
  if (body.lastName !== undefined) user.lastName = body.lastName.trim();
  if (body.isActive !== undefined) user.isActive = !!body.isActive;

  if (body.phone !== undefined) {
    const phone = body.phone ? normalizePhone(body.phone) : null;
    if (body.phone && !phone) throw new ApiError(400, "Telefon raqam noto'g'ri");
    user.phone = phone || undefined;
  }

  if (body.birthDate !== undefined) {
    user.birthDate = body.birthDate ? new Date(body.birthDate) : null;
  }
  if (body.gender !== undefined) {
    user.gender = body.gender || null;
  }
  if (body.address !== undefined) {
    user.address = body.address || "";
  }

  await user.save();
  return user;
};

// Self profile edit for the logged-in user (firstName, lastName, username).
export const updateSelfProfile = async (userId, body) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Foydalanuvchi topilmadi");

  if (body.firstName !== undefined) user.firstName = body.firstName.trim();
  if (body.lastName !== undefined) user.lastName = body.lastName.trim();

  if (body.username !== undefined) {
    const username = body.username.trim().toLowerCase();
    const taken = await User.exists({ username, _id: { $ne: user._id } });
    if (taken) throw new ApiError(409, "Bu login band");
    user.username = username;
  }

  await user.save();
  return user;
};

export const softRemove = async (id) => {
  const user = await getById(id);
  if (user.role === ROLES.OWNER) {
    throw new ApiError(403, "Owner foydalanuvchini o'chirib bo'lmaydi");
  }
  user.isActive = false;
  await user.save();
  return user;
};

// Toggle between `leader` and `player`. Both roles must exist in the Role collection.
// - leader → player: keep the owned Team (leader unchanged); just flip the user's role.
// - player → leader: detach from any team where they are a non-leader member.
export const switchSelfRole = async (user, newRole) => {
  if (!SELF_SWITCHABLE_ROLES.includes(newRole)) {
    throw new ApiError(400, "Bunday rolga o'tib bo'lmaydi");
  }
  if (![ROLES.LEADER, ROLES.PLAYER].includes(user.role)) {
    throw new ApiError(403, "Faqat leader yoki player rolini almashtirishi mumkin");
  }
  if (user.role === newRole) return user;

  const roleExists = await Role.exists({ value: newRole });
  if (!roleExists) throw new ApiError(500, "Bu rol tizimda topilmadi (seed kerak)");

  if (user.role === ROLES.PLAYER && newRole === ROLES.LEADER) {
    // Locked if the player is currently on an active tournament's main roster.
    if (await isUserLockedByActiveTournament(user._id)) {
      throw new ApiError(
        409,
        "Faol turnirda qatnashayotgan o'yinchi rolini almashtirib bo'lmaydi",
      );
    }
    // Detach from every team where this user is a non-leader member.
    await teamsService.detachFromAllTeams(user._id);
  }

  if (user.role === ROLES.LEADER && newRole === ROLES.PLAYER) {
    // Prevent "ghost team": leader can't switch while their team is mid-tournament.
    const team = await Team.findOne({ leader: user._id });
    if (team) {
      const active = await findActiveRegistration(team._id);
      if (active) {
        throw new ApiError(
          409,
          "Komandangiz faol turnirda - turnir tugamaguncha rolni almashtirib bo'lmaydi",
        );
      }
    }
  }

  user.role = newRole;
  await user.save();
  return user;
};

// Self password change for panel users (owner/admin). Verifies the current password first.
export const changeOwnPassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new ApiError(404, "Foydalanuvchi topilmadi");
  if (!user.passwordHash) {
    throw new ApiError(400, "Bu foydalanuvchida parol o'rnatilmagan");
  }
  const ok = await comparePassword(currentPassword, user.passwordHash);
  if (!ok) throw new ApiError(400, "Joriy parol noto'g'ri");

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  return { success: true };
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
