import Group from "../../../models/group.model.js";
import TournamentRegistration from "../../../models/tournamentRegistration.model.js";
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
