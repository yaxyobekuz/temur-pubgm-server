import Stage from "../../../models/stage.model.js";
import Tournament from "../../../models/tournament.model.js";
import Group from "../../../models/group.model.js";
import ApiError from "../../../utils/ApiError.js";
import {
  ALL_STAGE_ORDERS,
  STAGE_STATUS,
} from "../../../constants/tournament.js";

export const listByTournament = async (tournamentId) => {
  return Stage.find({ tournament: tournamentId }).sort({ order: 1 });
};

export const getById = async (id) => {
  const stage = await Stage.findById(id);
  if (!stage) throw new ApiError(404, "Bosqich topilmadi");
  return stage;
};

export const create = async (body) => {
  if (!ALL_STAGE_ORDERS.includes(body.order)) {
    throw new ApiError(400, "Bosqich tartibi noto'g'ri");
  }
  const tournament = await Tournament.findById(body.tournamentId);
  if (!tournament) throw new ApiError(404, "Turnir topilmadi");

  const exists = await Stage.findOne({ tournament: tournament._id, order: body.order });
  if (exists) throw new ApiError(409, "Bu bosqich allaqachon yaratilgan");

  return Stage.create({
    tournament: tournament._id,
    order: body.order,
    status: STAGE_STATUS.PENDING,
    startAt: body.startAt ? new Date(body.startAt) : null,
    endAt: body.endAt ? new Date(body.endAt) : null,
    maxGroups: body.maxGroups ?? 3,
    maxTeamsPerGroup: body.maxTeamsPerGroup ?? 20,
  });
};

export const update = async (id, body) => {
  const stage = await getById(id);
  if (body.status !== undefined) {
    if (!Object.values(STAGE_STATUS).includes(body.status)) {
      throw new ApiError(400, "Status noto'g'ri");
    }
    stage.status = body.status;
  }
  if (body.startAt !== undefined) stage.startAt = body.startAt ? new Date(body.startAt) : null;
  if (body.endAt !== undefined) stage.endAt = body.endAt ? new Date(body.endAt) : null;
  if (body.maxGroups !== undefined) stage.maxGroups = body.maxGroups;
  if (body.maxTeamsPerGroup !== undefined) stage.maxTeamsPerGroup = body.maxTeamsPerGroup;
  await stage.save();
  return stage;
};

export const remove = async (id) => {
  const stage = await getById(id);
  const groupCount = await Group.countDocuments({ stage: stage._id });
  if (groupCount > 0) {
    throw new ApiError(400, "Bosqichda guruhlar bor - avval guruhlarni o'chiring");
  }
  await stage.deleteOne();
};

// Phase 2: parks team IDs onto a target group inside this stage.
// Phase 3 will wire this to TournamentRegistration IDs.
export const promote = async (stageId, { groupId, teamIds = [] }) => {
  const stage = await getById(stageId);
  const group = await Group.findOne({ _id: groupId, stage: stage._id });
  if (!group) throw new ApiError(404, "Guruh topilmadi yoki bu bosqichga tegishli emas");
  if (group.teams.length + teamIds.length > group.maxTeams) {
    throw new ApiError(400, `Guruhda joy yetmaydi (max ${group.maxTeams})`);
  }
  // Dedupe.
  const existing = new Set(group.teams.map((t) => String(t)));
  for (const id of teamIds) {
    if (!existing.has(String(id))) group.teams.push(id);
  }
  await group.save();
  return group;
};
