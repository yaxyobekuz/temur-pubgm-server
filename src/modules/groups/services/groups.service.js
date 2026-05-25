import Group from "../../../models/group.model.js";
import ApiError from "../../../utils/ApiError.js";

export const listByStage = async (stageId) => {
  return Group.find({ stage: stageId }).sort({ code: 1 });
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
