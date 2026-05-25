import Group from "../../../models/group.model.js";
import Stage from "../../../models/stage.model.js";
import ApiError from "../../../utils/ApiError.js";
import { DEFAULT_MAX_TEAMS_PER_GROUP } from "../../../constants/tournament.js";

export const listByStage = async (stageId) => {
  return Group.find({ stage: stageId }).sort({ code: 1 });
};

export const getById = async (id) => {
  const g = await Group.findById(id);
  if (!g) throw new ApiError(404, "Guruh topilmadi");
  return g;
};

export const create = async (body) => {
  const stage = await Stage.findById(body.stageId);
  if (!stage) throw new ApiError(404, "Bosqich topilmadi");

  const total = await Group.countDocuments({ stage: stage._id });
  if (total >= stage.maxGroups) {
    throw new ApiError(400, `Bu bosqichda max ${stage.maxGroups} guruh bo'lishi mumkin`);
  }
  const code = String(body.code || "").trim().toUpperCase();
  if (!code) throw new ApiError(400, "Guruh kodini kiriting");

  const exists = await Group.findOne({ stage: stage._id, code });
  if (exists) throw new ApiError(409, "Bu kod allaqachon bor");

  return Group.create({
    stage: stage._id,
    code,
    maxTeams: body.maxTeams ?? stage.maxTeamsPerGroup ?? DEFAULT_MAX_TEAMS_PER_GROUP,
    teams: [],
  });
};

export const update = async (id, body) => {
  const g = await getById(id);
  if (body.code !== undefined) {
    const code = String(body.code).trim().toUpperCase();
    if (code !== g.code) {
      const clash = await Group.findOne({ stage: g.stage, code });
      if (clash) throw new ApiError(409, "Bu kod allaqachon bor");
      g.code = code;
    }
  }
  if (body.maxTeams !== undefined) {
    if (body.maxTeams < g.teams.length) {
      throw new ApiError(400, "maxTeams hozirgi komandalar sonidan kichik bo'lishi mumkin emas");
    }
    g.maxTeams = body.maxTeams;
  }
  if (body.teams !== undefined) {
    // Replace teams set entirely; cap at maxTeams.
    const set = Array.from(new Set(body.teams.map(String)));
    if (set.length > g.maxTeams) {
      throw new ApiError(400, `Guruhda max ${g.maxTeams} komanda bo'lishi mumkin`);
    }
    g.teams = set;
  }
  await g.save();
  return g;
};

export const remove = async (id) => {
  const g = await getById(id);
  await g.deleteOne();
};

export const removeTeam = async (id, teamId) => {
  const g = await getById(id);
  g.teams = g.teams.filter((t) => String(t) !== String(teamId));
  await g.save();
  return g;
};
