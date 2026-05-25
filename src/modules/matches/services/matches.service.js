import mongoose from "mongoose";
import Match, { MATCH_STATUS } from "../../../models/match.model.js";
import Stage from "../../../models/stage.model.js";
import Group from "../../../models/group.model.js";
import Tournament from "../../../models/tournament.model.js";
import TournamentRegistration from "../../../models/tournamentRegistration.model.js";
import ApiError from "../../../utils/ApiError.js";
import { computeMatchPoints } from "../../../constants/pubgPoints.js";
import * as broadcastsService from "../../broadcasts/services/broadcasts.service.js";
import { BROADCAST_TARGET } from "../../../models/broadcastJob.model.js";

export const listByGroup = async (groupId) =>
  Match.find({ group: groupId }).sort({ order: 1 });

export const listByStage = async (stageId) =>
  Match.find({ stage: stageId })
    .sort({ "group.code": 1, order: 1 })
    .populate("group", "code");

export const listByTournament = async (tournamentId) => {
  const stages = await Stage.find({ tournament: tournamentId }, "_id order").sort({ order: 1 });
  if (!stages.length) return [];
  const stageIds = stages.map((s) => s._id);
  const matches = await Match.find({ stage: { $in: stageIds } })
    .sort({ order: 1 })
    .populate("group", "code")
    .populate("stage", "order");
  return matches;
};

export const getById = async (id) => {
  const m = await Match.findById(id)
    .populate("group", "code teams maxTeams")
    .populate("stage", "order tournament")
    .populate({
      path: "results.registration",
      select: "team",
      populate: { path: "team", select: "name logo" },
    });
  if (!m) throw new ApiError(404, "Match topilmadi");
  return m;
};

export const create = async (body) => {
  const group = await Group.findById(body.groupId).populate("stage", "_id tournament");
  if (!group) throw new ApiError(404, "Guruh topilmadi");

  const order = body.order ?? (await Match.countDocuments({ group: group._id })) + 1;

  return Match.create({
    stage: group.stage._id,
    group: group._id,
    order,
    map: body.map?.trim() || "",
    startAt: body.startAt ? new Date(body.startAt) : null,
    roomId: body.roomId?.trim() || "",
    roomPassword: body.roomPassword?.trim() || "",
    status: MATCH_STATUS.SCHEDULED,
  });
};

export const update = async (id, body) => {
  const m = await Match.findById(id);
  if (!m) throw new ApiError(404, "Match topilmadi");

  if (body.map !== undefined) m.map = body.map.trim();
  if (body.startAt !== undefined) m.startAt = body.startAt ? new Date(body.startAt) : null;
  if (body.roomId !== undefined) m.roomId = body.roomId.trim();
  if (body.roomPassword !== undefined) m.roomPassword = body.roomPassword.trim();
  if (body.status !== undefined) {
    if (!Object.values(MATCH_STATUS).includes(body.status)) {
      throw new ApiError(400, "Status noto'g'ri");
    }
    m.status = body.status;
  }
  if (body.order !== undefined) m.order = body.order;

  await m.save();
  return m;
};

export const remove = async (id) => {
  const m = await Match.findById(id);
  if (!m) throw new ApiError(404, "Match topilmadi");
  if (m.status !== MATCH_STATUS.SCHEDULED) {
    throw new ApiError(400, "Faqat rejalashtirilgan matchni o'chirish mumkin");
  }
  await m.deleteOne();
};

const validateAndNormalizeResults = async (match, results = []) => {
  // Pull live group registrations to make sure we only accept teams that belong to the group.
  const group = await Group.findById(match.group, "teams");
  if (!group) throw new ApiError(404, "Guruh topilmadi");
  const allowed = new Set(group.teams.map((t) => String(t)));

  const seen = new Set();
  return results.map((r) => {
    const regId = String(r.registration);
    if (!allowed.has(regId)) {
      throw new ApiError(400, "Kiritilgan komanda guruhga tegishli emas");
    }
    if (seen.has(regId)) {
      throw new ApiError(400, "Bitta komanda ikki marta kiritilgan");
    }
    seen.add(regId);
    const place = r.place != null ? Number(r.place) : null;
    const kills = Math.max(0, Number(r.kills) || 0);
    return {
      registration: new mongoose.Types.ObjectId(regId),
      place,
      kills,
      points: place ? computeMatchPoints({ place, kills }) : kills,
      finishedAt: new Date(),
    };
  });
};

export const setResults = async (id, results) => {
  const m = await Match.findById(id);
  if (!m) throw new ApiError(404, "Match topilmadi");

  m.results = await validateAndNormalizeResults(m, results);
  m.status = MATCH_STATUS.FINISHED;
  await m.save();
  return m;
};

// Standings aggregation: total points/kills per registration across all FINISHED matches in the stage.
export const stageStandings = async (stageId) => {
  const stageObjId = new mongoose.Types.ObjectId(stageId);

  const rows = await Match.aggregate([
    { $match: { stage: stageObjId, status: MATCH_STATUS.FINISHED } },
    { $unwind: "$results" },
    {
      $group: {
        _id: "$results.registration",
        totalPoints: { $sum: "$results.points" },
        totalKills: { $sum: "$results.kills" },
        bestPlace: { $min: "$results.place" },
        matchesPlayed: { $sum: 1 },
      },
    },
    { $sort: { totalPoints: -1, totalKills: -1, bestPlace: 1 } },
  ]);

  const ids = rows.map((r) => r._id);
  const regs = await TournamentRegistration.find({ _id: { $in: ids } })
    .populate("team", "name logo")
    .populate("currentGroup", "code");
  const regMap = new Map(regs.map((r) => [String(r._id), r]));

  return rows.map((r) => {
    const reg = regMap.get(String(r._id));
    return {
      registration: r._id,
      team: reg?.team || null,
      group: reg?.currentGroup || null,
      totalPoints: r.totalPoints,
      totalKills: r.totalKills,
      bestPlace: r.bestPlace,
      matchesPlayed: r.matchesPlayed,
    };
  });
};

// Enqueue a broadcast that delivers room credentials to the group's registrations.
export const broadcastRoomCredentials = async (matchId, currentUser) => {
  const match = await Match.findById(matchId).populate("stage", "tournament");
  if (!match) throw new ApiError(404, "Match topilmadi");
  if (!match.roomId || !match.roomPassword) {
    throw new ApiError(400, "Avval xona ID va parolni kiriting");
  }

  const tournament = await Tournament.findById(match.stage.tournament, "title");
  const lines = [
    `<b>${tournament?.title || "Turnir"}</b> - xona ma'lumotlari`,
    "",
    `Match: <b>#${match.order}</b>${match.map ? ` (${match.map})` : ""}`,
    `Room ID: <code>${match.roomId}</code>`,
    `Parol: <code>${match.roomPassword}</code>`,
  ];

  const job = await broadcastsService.create(
    {
      title: `Xona: ${tournament?.title || "Match"} #${match.order}`,
      body: lines.join("\n"),
      target: { type: BROADCAST_TARGET.GROUP, ids: [match.group.toString()] },
    },
    currentUser,
  );

  // Mark match as live once credentials are dispatched.
  if (match.status === MATCH_STATUS.SCHEDULED) {
    match.status = MATCH_STATUS.LIVE;
    await match.save();
  }

  return { match, job };
};
