import Group from "../../../models/group.model.js";
import TournamentRegistration, {
  REGISTRATION_STATUS,
} from "../../../models/tournamentRegistration.model.js";
import ApiError from "../../../utils/ApiError.js";

// Populates `teams[]` with `{ registrationId, team: { name, ... } }` shape so UI
// can render team names without N+1 fetches.
export const listByStage = async (stageId) => {
  const groups = await Group.find({ stage: stageId }).sort({ code: 1 }).lean();
  const allRegIds = groups.flatMap((g) => g.teams || []);
  if (!allRegIds.length) return groups;
  const regs = await TournamentRegistration.find({ _id: { $in: allRegIds } })
    .populate("team", "name leader")
    .lean();
  const byId = new Map(regs.map((r) => [String(r._id), r]));
  return groups.map((g) => ({
    ...g,
    teams: (g.teams || []).map((id) => {
      const r = byId.get(String(id));
      return { registrationId: String(id), team: r?.team || null };
    }),
  }));
};

export const getById = async (id) => {
  const g = await Group.findById(id);
  if (!g) throw new ApiError(404, "Guruh topilmadi");
  return g;
};

export const removeTeam = async (id, teamId) => {
  const g = await getById(id);
  g.teams = g.teams.filter((t) => String(t) !== String(teamId));
  await g.save();
  return g;
};

// Re-add a previously removed team (registrationId) back into the group.
export const addTeam = async (id, teamId) => {
  const g = await getById(id);
  if (g.teams.some((t) => String(t) === String(teamId))) {
    throw new ApiError(409, "Bu komanda allaqachon guruhda");
  }
  if (g.teams.length >= g.maxTeams) {
    throw new ApiError(409, "Guruh to'lgan");
  }
  const reg = await TournamentRegistration.findById(teamId);
  if (!reg) throw new ApiError(404, "Komanda topilmadi");
  if (reg.status !== REGISTRATION_STATUS.REGISTERED) {
    throw new ApiError(400, "Bu komanda turnirda faol emas");
  }
  g.teams.push(teamId);
  await g.save();
  return g;
};
