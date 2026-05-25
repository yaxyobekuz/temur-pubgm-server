import User from "../../../models/user.model.js";
import Region from "../../../models/region.model.js";
import Team from "../../../models/team.model.js";
import ApiError from "../../../utils/ApiError.js";
import { ROLES } from "../../../constants/roles.js";
import { normalizePhone } from "../../../utils/phone.js";
import * as usersService from "../../users/services/users.service.js";
import * as teamsService from "../../teams/services/teams.service.js";
import * as tournamentsService from "../../tournaments/services/tournaments.service.js";
import * as registrationsService from "../../registrations/services/registrations.service.js";

export const registerOrLogin = async (body) => {
  const tgId = Number(body.tgId);
  if (!Number.isInteger(tgId) || tgId <= 0) {
    throw new ApiError(400, "tgId noto'g'ri");
  }

  const region = await Region.findById(body.regionId);
  if (!region) {
    throw new ApiError(404, "Mintaqa topilmadi");
  }

  const phone = normalizePhone(body.contactPhone);
  if (!phone) throw new ApiError(400, "Telefon raqam noto'g'ri");

  const existing = await User.findOne({ tgId });
  if (existing) {
    existing.tgUsername = (body.tgUsername || "").toLowerCase();
    existing.firstName = body.firstName?.trim() || existing.firstName;
    if (body.lastName !== undefined) existing.lastName = body.lastName?.trim() || "";
    existing.contactPhone = phone;
    if (!existing.phone) existing.phone = phone;
    existing.region = region._id;
    existing.isActive = true;
    await existing.save();
    return { user: existing, created: false };
  }

  const user = await User.create({
    firstName: body.firstName?.trim() || "Foydalanuvchi",
    lastName: body.lastName?.trim() || "",
    role: ROLES.PLAYER,
    tgId,
    tgUsername: (body.tgUsername || "").toLowerCase(),
    contactPhone: phone,
    phone,
    region: region._id,
    isActive: true,
  });
  return { user, created: true };
};

const findByTgId = async (tgId) => {
  const n = Number(tgId);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, "tgId noto'g'ri");
  const user = await User.findOne({ tgId: n }).populate("region");
  if (!user) throw new ApiError(404, "Foydalanuvchi topilmadi");
  return user;
};

export const getMe = async (tgId) => {
  return findByTgId(tgId);
};

export const switchRole = async (tgId, newRole) => {
  const user = await findByTgId(tgId);
  return usersService.switchSelfRole(user, newRole);
};

export const getMyTeam = async (tgId) => {
  const user = await findByTgId(tgId);
  return teamsService.getMyTeam(user._id);
};

export const createTeam = async (tgId, body) => {
  const user = await findByTgId(tgId);
  return teamsService.createForLeader(user, body);
};

export const updateOwnTeam = async (tgId, body) => {
  const user = await findByTgId(tgId);
  return teamsService.updateOwn(user, body);
};

export const regenerateOwnInvite = async (tgId) => {
  const user = await findByTgId(tgId);
  return teamsService.regenerateInvite(user);
};

export const kickFromOwnTeam = async (tgId, memberId) => {
  const user = await findByTgId(tgId);
  return teamsService.kickMember(user, memberId);
};

export const leaveTeam = async (tgId) => {
  const user = await findByTgId(tgId);
  return teamsService.leave(user);
};

export const acceptInvite = async (tgId, inviteCode) => {
  const user = await findByTgId(tgId);
  return teamsService.acceptInvite(user, inviteCode);
};

// --- Tournaments (bot-only) ------------------------------------------------

export const listOpenTournaments = async () => {
  const { items } = await tournamentsService.list({
    status: "registration",
    page: 1,
    limit: 100,
  });
  return items;
};

export const getTournamentForBot = async (id) => {
  return tournamentsService.getById(id);
};

export const registerForTournament = async (tgId, tournamentId, roster) => {
  const user = await findByTgId(tgId);
  if (user.role !== ROLES.LEADER) {
    throw new ApiError(403, "Faqat leader turnirga ro'yxatdan o'tkaza oladi");
  }
  return registrationsService.register({
    tournamentId,
    leaderUser: user,
    roster,
  });
};

export const myRegistrations = async (tgId) => {
  const user = await findByTgId(tgId);
  // User'ning komandasi (leader bo'lsa o'zining, player bo'lsa a'zo bo'lgan)
  const team = await Team.findOne({ members: user._id });
  if (!team) return [];
  return registrationsService.listByTeam(team._id);
};
