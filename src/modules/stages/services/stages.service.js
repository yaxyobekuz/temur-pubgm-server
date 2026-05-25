import Stage from "../../../models/stage.model.js";
import Group from "../../../models/group.model.js";
import ApiError from "../../../utils/ApiError.js";
import { DEFAULT_GROUP_SIZE } from "../../../constants/tournament.js";

export const listByTournament = async (tournamentId) => {
  return Stage.find({ tournament: tournamentId }).sort({ order: 1 });
};

export const getById = async (id) => {
  const stage = await Stage.findById(id);
  if (!stage) throw new ApiError(404, "Bosqich topilmadi");
  return stage;
};

export const getByTournamentAndOrder = async (tournamentId, order) => {
  const stage = await Stage.findOne({ tournament: tournamentId, order });
  if (!stage) throw new ApiError(404, "Bosqich topilmadi");
  return stage;
};

// Generates Excel-style group codes: A, B, ..., Z, AA, AB, ..., AZ, BA, ...
export const generateGroupCode = (index) => {
  let n = index;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// Wipes the stage's groups and re-creates them with auto-coded chunks of `teamRefs`.
export const autoAssignGroups = async (stageId, teamRefs = []) => {
  const stage = await getById(stageId);
  await Group.deleteMany({ stage: stage._id });
  if (!teamRefs.length) return [];
  const parts = chunk(teamRefs.map(String), DEFAULT_GROUP_SIZE);
  const docs = parts.map((teams, i) => ({
    stage: stage._id,
    code: generateGroupCode(i),
    maxTeams: DEFAULT_GROUP_SIZE,
    teams,
  }));
  return Group.insertMany(docs);
};
