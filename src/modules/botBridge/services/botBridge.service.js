import User from "../../../models/user.model.js";
import Region from "../../../models/region.model.js";
import Team from "../../../models/team.model.js";
import Tournament from "../../../models/tournament.model.js";
import ApiError from "../../../utils/ApiError.js";
import { ROLES } from "../../../constants/roles.js";
import { TOURNAMENT_STATUS } from "../../../constants/tournament.js";
import { sanitizeIntlPhone } from "../../../utils/phone.js";
import { parseTelegramUsername } from "../../../utils/telegramUsername.js";
import * as usersService from "../../users/services/users.service.js";
import * as teamsService from "../../teams/services/teams.service.js";
import * as tournamentsService from "../../tournaments/services/tournaments.service.js";
import * as registrationsService from "../../registrations/services/registrations.service.js";
import * as stagesService from "../../stages/services/stages.service.js";
import * as groupsService from "../../groups/services/groups.service.js";
import * as helpLinksService from "../../helpLinks/services/helpLinks.service.js";
import * as settingsService from "../../settings/services/settings.service.js";
import { saveImageFromUrl } from "../../../utils/uploadFile.js";

export const registerOrLogin = async (body) => {
  const tgId = Number(body.tgId);
  if (!Number.isInteger(tgId) || tgId <= 0) {
    throw new ApiError(400, "tgId noto'g'ri");
  }

  const region = await Region.findById(body.regionId);
  if (!region) {
    throw new ApiError(404, "Mintaqa topilmadi");
  }

  // Telegram raqamni tasdiqlagan - har qanday davlat raqamini qabul qilamiz (998-ga majburlamaymiz).
  const phone = sanitizeIntlPhone(body.contactPhone);
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

  // Yangi user tanlagan rol (sardor/o'yinchi); bo'lmasa - o'yinchi.
  const role = body.role === ROLES.LEADER ? ROLES.LEADER : ROLES.PLAYER;
  const user = await User.create({
    firstName: body.firstName?.trim() || "Foydalanuvchi",
    lastName: body.lastName?.trim() || "",
    role,
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

export const switchRegion = async (tgId, regionId) => {
  const user = await findByTgId(tgId);
  const region = await Region.findById(regionId);
  if (!region) throw new ApiError(404, "Mintaqa topilmadi");
  user.region = region._id;
  await user.save();
  return user.populate("region");
};

export const updateContactUsername = async (tgId, raw) => {
  const user = await findByTgId(tgId);
  const username = parseTelegramUsername(raw);
  if (!username) throw new ApiError(400, "Username noto'g'ri. Masalan: @username");
  user.contactUsername = username;
  await user.save();
  return user;
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
  const patch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.tag !== undefined) patch.tag = body.tag;
  // A Telegram file URL → download + store locally; cache the file_id for fast resends.
  if (body.logoUrl) {
    patch.logo = await saveImageFromUrl(body.logoUrl);
    if (body.logoFileId) patch.logoFileId = body.logoFileId;
  }
  return teamsService.updateOwn(user, patch);
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

// Show both PENDING (open for registration) and ONGOING (in progress) tournaments so
// leaders can still reach a tournament's detail (e.g. to request a VIP slot) after it starts.
export const listOpenTournaments = async () => {
  const { items } = await tournamentsService.list({ page: 1, limit: 100 });
  return items.filter((t) =>
    [TOURNAMENT_STATUS.PENDING, TOURNAMENT_STATUS.ONGOING].includes(t.status),
  );
};

export const getTournamentForBot = async (id) => {
  const t = await tournamentsService.getById(id);
  // Draft tournaments are admin-only; never expose them to the bot, even by direct id.
  if (t.status === TOURNAMENT_STATUS.DRAFT) {
    throw new ApiError(404, "Turnir topilmadi");
  }
  return t;
};

// Bot caches the Telegram file_id after first uploading the banner photo.
export const setTournamentBannerFileId = async (id, fileId) => {
  const t = await Tournament.findByIdAndUpdate(
    id,
    { bannerFileId: fileId },
    { new: true },
  );
  if (!t) throw new ApiError(404, "Turnir topilmadi");
  return { _id: t._id, bannerFileId: t.bannerFileId };
};

// Open day+time slots of a tournament's stage-1 group skeleton (cascading register menu).
export const getOpenSlots = async (tournamentId) => {
  const stage1 = await stagesService.getByTournamentAndOrder(tournamentId, 1);
  return stagesService.listOpenSlots(stage1._id);
};

// The leader's team registration awaiting placement into its next/VIP stage, plus open slots.
export const getPendingPlacement = async (tgId) => {
  const user = await findByTgId(tgId);
  return registrationsService.getPendingPlacement(user);
};

// Advanced/VIP team picks a day+time slot for its eligible stage. `roster` is only sent by
// brand-new VIP teams whose registration has no roster yet.
export const placeIntoStage = async (tgId, registrationId, day, timeSlot, roster) => {
  const user = await findByTgId(tgId);
  return registrationsService.placeIntoStage({
    leaderUser: user,
    registrationId,
    day,
    timeSlot,
    roster,
  });
};

// --- Help links (bot-only) -------------------------------------------------

export const listHelpLinks = async () => {
  return helpLinksService.listActive();
};

// --- Secret group (bot-only) -----------------------------------------------

// `/teams` inside a secret group: lists the teams placed into the group wired to this chat.
export const getSecretGroupTeams = async (chatId) => {
  const result = await groupsService.listTeamsBySecretChatId(chatId);
  if (!result) {
    throw new ApiError(404, "Bu guruh hech qaysi turnir guruhiga maxfiy guruh sifatida ulanmagan");
  }
  return result;
};

// --- Settings (bot-only) ---------------------------------------------------

// Panel-wide settings the bot needs: the VIP-slot admin contact link.
export const getSettingsForBot = async () => {
  return { vipAdminUrl: await settingsService.getVipAdminUrl() };
};

export const registerForTournament = async (tgId, tournamentId, roster, day, timeSlot) => {
  const user = await findByTgId(tgId);
  if (user.role !== ROLES.LEADER) {
    throw new ApiError(403, "Faqat leader turnirga ro'yxatdan o'tkaza oladi");
  }
  return registrationsService.register({
    tournamentId,
    leaderUser: user,
    roster,
    day,
    timeSlot,
  });
};

// Early sponsor-subscription check (whole team) when the leader taps "Register",
// before the roster is picked. Returns { ok, channels, members:[{name}] } and DMs missing members.
export const checkTeamSponsorMembership = async (tgId, tournamentId) => {
  const user = await findByTgId(tgId);
  if (user.role !== ROLES.LEADER) {
    throw new ApiError(403, "Faqat leader turnirga ro'yxatdan o'tkaza oladi");
  }
  const tournament = await tournamentsService.getById(tournamentId);
  const team = await Team.findOne({ leader: user._id }).populate(
    "members",
    "tgId firstName lastName tgUsername",
  );
  if (!team) throw new ApiError(404, "Sizning komandangiz topilmadi");

  const sub = await registrationsService.evaluateSponsorMembership({
    tournament,
    users: team.members,
    leaderId: user._id,
  });
  return { ok: sub.ok, channels: sub.channels, members: sub.members.map((m) => ({ name: m.name })) };
};

export const myRegistrations = async (tgId) => {
  const user = await findByTgId(tgId);
  // User'ning komandasi (leader bo'lsa o'zining, player bo'lsa a'zo bo'lgan)
  const team = await Team.findOne({ members: user._id });
  if (!team) return [];
  return registrationsService.listByTeam(team._id);
};

// /start: resend any sponsor-subscription reminders that failed to reach this user earlier.
export const resendSponsorReminders = async (tgId) => {
  return registrationsService.resendPendingSponsorReminders(tgId);
};

// /start: re-deliver a VIP-slot notice that failed to reach the leader earlier (bot blocked).
export const resendPlacementNotice = async (tgId) => {
  return registrationsService.resendPendingPlacementNotice(tgId);
};

// "Mening turnirlarim": this user's own missing sponsor channels for a tournament (no side-effects).
export const getSelfSponsorChannels = async (tgId, tournamentId) => {
  const user = await findByTgId(tgId);
  const tournament = await tournamentsService.getById(tournamentId);
  const channels = await registrationsService.getMissingChannelsForUser(tournament, user);
  // ok is gated on Telegram only; when there's something to fix, also surface the
  // unverifiable social channels (YouTube/Instagram) so the user can subscribe to them too.
  const display = channels.length
    ? [...channels, ...registrationsService.socialSponsorChannels(tournament)]
    : channels;
  return { ok: channels.length === 0, channels: display, tournamentTitle: tournament.title };
};
