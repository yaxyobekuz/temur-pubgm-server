import Group from "../../../models/group.model.js";
import Stage from "../../../models/stage.model.js";
import TournamentRegistration, {
  REGISTRATION_STATUS,
} from "../../../models/tournamentRegistration.model.js";
import ApiError from "../../../utils/ApiError.js";
import { TEAM_PLACEMENT_KIND, stageCapacity } from "../../../constants/tournament.js";

// Joins the stage schedule (date + time) onto a group by its day/timeSlot.
const attachSchedule = (group, stage) => {
  const sd = (stage?.schedule || []).find((x) => x.day === group.day);
  const st = sd?.timeSlots?.find((x) => x.timeSlot === group.timeSlot);
  return { ...group, date: sd?.date || null, time: st?.time || "" };
};

// Populates `teams[]` with `{ registrationId, kind, team: { name, ... } }` and attaches the
// concrete `date`/`time` from the stage schedule. Sorted day -> timeSlot -> code.
export const listByStage = async (stageId) => {
  const [groups, stage] = await Promise.all([
    Group.find({ stage: stageId }).sort({ day: 1, timeSlot: 1, code: 1 }).lean(),
    Stage.findById(stageId).lean(),
  ]);
  const allRegIds = groups.flatMap((g) => (g.teams || []).map((t) => t.registration));
  const regs = allRegIds.length
    ? await TournamentRegistration.find({ _id: { $in: allRegIds } })
        .populate("team", "name tag leader")
        .lean()
    : [];
  const byId = new Map(regs.map((r) => [String(r._id), r]));
  return groups.map((g) => ({
    ...attachSchedule(g, stage),
    teams: (g.teams || []).map((t) => {
      const r = byId.get(String(t.registration));
      return {
        registrationId: String(t.registration),
        kind: t.kind,
        placement: t.placement ?? null,
        team: r?.team || null,
      };
    }),
  }));
};

export const getById = async (id) => {
  const g = await Group.findById(id);
  if (!g) throw new ApiError(404, "Guruh topilmadi");
  return g;
};

export const removeTeam = async (id, registrationId) => {
  const g = await getById(id);
  g.teams = g.teams.filter((t) => String(t.registration) !== String(registrationId));
  await g.save();
  // Clear the team's placement pointer if it pointed here.
  await TournamentRegistration.updateOne(
    { _id: registrationId, currentGroup: g._id },
    { $set: { currentGroup: null } },
  );
  return g;
};

// Place a registration into a group, tagged by `kind` (normal/advanced/vip).
export const addTeam = async (id, registrationId, kind = TEAM_PLACEMENT_KIND.NORMAL) => {
  const g = await getById(id);
  if (g.teams.some((t) => String(t.registration) === String(registrationId))) {
    throw new ApiError(409, "Bu komanda allaqachon guruhda");
  }
  if (g.teams.length >= g.maxTeams) {
    throw new ApiError(409, "Guruh to'lgan");
  }
  const reg = await TournamentRegistration.findById(registrationId);
  if (!reg) throw new ApiError(404, "Komanda topilmadi");
  if (reg.status !== REGISTRATION_STATUS.REGISTERED) {
    throw new ApiError(400, "Bu komanda turnirda faol emas");
  }
  g.teams.push({ registration: registrationId, kind });
  await g.save();
  return g;
};

// Secret group: the leader must join this group's private group before being placed here.
// Both the invite url and the numeric chatId are required; the admin reads the chatId via
// the bot's /id command. Configured per group (day/time/group) up front.
export const setSecretGroup = async (groupId, body) => {
  const g = await getById(groupId);
  g.secretGroup = {
    url: body.url.trim(),
    chatId: body.chatId.trim(),
    title: body.title?.trim() || "",
    resolvedAt: new Date(),
  };
  await g.save();
  return g;
};

export const clearSecretGroup = async (groupId) => {
  const g = await getById(groupId);
  g.secretGroup = {};
  await g.save();
  return g;
};

// Lobby slots 1-2 are reserved for the host/observers, so placed teams start at slot 3.
const RESERVED_LOBBY_SLOTS = 2;

// Looks up the group whose secret group has this Telegram chatId and returns its placed teams
// as a slot-numbered list `{ slot, name, username, kind }` (placement order). The leader's
// manual contact handle wins, falling back to the auto-captured Telegram username.
// Returns null when no group is wired to this chat (the bot turns that into a friendly reply).
export const listTeamsBySecretChatId = async (chatId) => {
  const group = await Group.findOne({ "secretGroup.chatId": String(chatId) }).lean();
  if (!group) return null;

  const regIds = (group.teams || []).map((t) => t.registration);
  const regs = regIds.length
    ? await TournamentRegistration.find({ _id: { $in: regIds } })
        .populate({
          path: "team",
          select: "name tag leader",
          populate: { path: "leader", select: "tgUsername contactUsername" },
        })
        .lean()
    : [];
  const byId = new Map(regs.map((r) => [String(r._id), r]));

  const teams = (group.teams || []).map((t, i) => {
    const team = byId.get(String(t.registration))?.team;
    const leader = team?.leader;
    return {
      slot: RESERVED_LOBBY_SLOTS + i + 1,
      name: team?.name || "—",
      tag: team?.tag || "",
      username: leader?.contactUsername || leader?.tgUsername || "",
      kind: t.kind,
    };
  });

  return { code: group.code, title: group.secretGroup?.title || "", teams };
};

// Stage groups + how many more teams can still be placed (= VIP capacity remaining).
export const getStageGroupsWithCapacity = async (stageId) => {
  const stage = await Stage.findById(stageId);
  if (!stage) throw new ApiError(404, "Bosqich topilmadi");
  const groups = await listByStage(stageId);
  const placed = groups.reduce((sum, g) => sum + (g.teams?.length || 0), 0);
  const capacity = stageCapacity(stage.config);
  return { groups, capacity, placed, vipRemaining: Math.max(0, capacity - placed) };
};
