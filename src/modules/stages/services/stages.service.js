import Stage from "../../../models/stage.model.js";
import Group from "../../../models/group.model.js";
import ApiError from "../../../utils/ApiError.js";
import { stageCapacity, STAGE_DAY_LABEL, TIME_SLOT_LABEL } from "../../../constants/tournament.js";
import { formatDateUz } from "../../../utils/dateUz.js";

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

// Builds the fixed empty group skeleton for a stage from its config:
// daysCount × timeSlotsPerDay × groupsPerTimeSlot groups, sequentially coded A, B, C, ...
// Idempotent: does nothing if the stage already has groups.
export const buildSkeleton = async (stage) => {
  const s = stage._id ? stage : await getById(stage);
  const existing = await Group.countDocuments({ stage: s._id });
  if (existing > 0) return Group.find({ stage: s._id }).sort({ code: 1 });

  const { daysCount, timeSlotsPerDay, groupsPerTimeSlot, maxTeamsPerGroup } = s.config;
  const docs = [];
  let codeIndex = 0;
  for (let day = 1; day <= daysCount; day += 1) {
    for (let timeSlot = 1; timeSlot <= timeSlotsPerDay; timeSlot += 1) {
      for (let g = 0; g < groupsPerTimeSlot; g += 1) {
        docs.push({
          stage: s._id,
          code: generateGroupCode(codeIndex),
          day,
          timeSlot,
          maxTeams: maxTeamsPerGroup,
          teams: [],
        });
        codeIndex += 1;
      }
    }
  }
  return Group.insertMany(docs);
};

// Wipes a stage's groups and rebuilds the empty skeleton (used when config changes).
export const rebuildSkeleton = async (stage) => {
  const s = stage._id ? stage : await getById(stage);
  await Group.deleteMany({ stage: s._id });
  return buildSkeleton(s);
};

export const computeStageCapacity = (stage) => stageCapacity(stage.config);

// Empty schedule rows (date=null, time="") generated from the stage config - used to seed the
// admin UI when the stage has no saved schedule yet, or to fill in missing days/slots.
export const buildEmptySchedule = (stage) => {
  const { daysCount, timeSlotsPerDay } = stage.config;
  return Array.from({ length: daysCount }, (_, di) => ({
    day: di + 1,
    date: null,
    timeSlots: Array.from({ length: timeSlotsPerDay }, (_, ti) => ({
      timeSlot: ti + 1,
      time: "",
    })),
  }));
};

// Returns the stage schedule normalized to the full day/timeSlot grid from config,
// merging in any saved values. Never persists.
export const ensureSchedule = (stage) => {
  const base = buildEmptySchedule(stage);
  const saved = stage.schedule || [];
  return base.map((d) => {
    const sd = saved.find((x) => x.day === d.day);
    return {
      day: d.day,
      date: sd?.date || null,
      timeSlots: d.timeSlots.map((t) => {
        const st = sd?.timeSlots?.find((x) => x.timeSlot === t.timeSlot);
        return { timeSlot: t.timeSlot, time: st?.time || "" };
      }),
    };
  });
};

// Validates the incoming schedule against the stage config grid and saves it.
export const setSchedule = async (stageId, schedule) => {
  const stage = await getById(stageId);
  const { daysCount, timeSlotsPerDay } = stage.config;
  const clean = [];
  for (const d of schedule || []) {
    if (d.day < 1 || d.day > daysCount) {
      throw new ApiError(400, "Kun raqami noto'g'ri");
    }
    const timeSlots = [];
    for (const t of d.timeSlots || []) {
      if (t.timeSlot < 1 || t.timeSlot > timeSlotsPerDay) {
        throw new ApiError(400, "Vaqt sloti raqami noto'g'ri");
      }
      timeSlots.push({ timeSlot: t.timeSlot, time: (t.time || "").trim() });
    }
    clean.push({ day: d.day, date: d.date ? new Date(d.date) : null, timeSlots });
  }
  stage.schedule = clean;
  await stage.save();
  return stage;
};

// True when every day has a date and every time slot has a time set.
export const isScheduleComplete = (stage) => {
  const full = ensureSchedule(stage);
  return full.every((d) => d.date && d.timeSlots.every((t) => t.time));
};

// { date, time } for a given day+timeSlot from the stage schedule (nulls if unset).
export const getScheduleSlot = (stage, day, timeSlot) => {
  const d = (stage.schedule || []).find((x) => x.day === day);
  const t = d?.timeSlots?.find((x) => x.timeSlot === timeSlot);
  return { date: d?.date || null, time: t?.time || "" };
};

// First group in the given day+timeSlot that still has a free spot, or null.
export const findOpenGroupForSlot = async (stageId, day, timeSlot) => {
  const groups = await Group.find({ stage: stageId, day, timeSlot }).sort({ code: 1 });
  return groups.find((g) => (g.teams?.length || 0) < g.maxTeams) || null;
};

// Cascading day -> timeSlot menu for the bot: only days/slots that still have a free spot.
// Labels come from the stage schedule (concrete date/time), with a numbered fallback.
export const listOpenSlots = async (stageId) => {
  const stage = await getById(stageId);
  const groups = await Group.find({ stage: stageId }).sort({ day: 1, timeSlot: 1, code: 1 }).lean();
  const byDay = new Map();
  for (const g of groups) {
    if (!byDay.has(g.day)) byDay.set(g.day, new Map());
    const slots = byDay.get(g.day);
    const free = Math.max(0, g.maxTeams - (g.teams?.length || 0));
    const prev = slots.get(g.timeSlot) || { timeSlot: g.timeSlot, freeSpots: 0 };
    prev.freeSpots += free;
    slots.set(g.timeSlot, prev);
  }

  const days = [];
  for (const [day, slotsMap] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    const sd = (stage.schedule || []).find((x) => x.day === day);
    const dateLabel = formatDateUz(sd?.date);
    const timeSlots = [...slotsMap.values()]
      .filter((s) => s.freeSpots > 0)
      .sort((a, b) => a.timeSlot - b.timeSlot)
      .map((s) => {
        const st = sd?.timeSlots?.find((x) => x.timeSlot === s.timeSlot);
        return {
          timeSlot: s.timeSlot,
          time: st?.time || "",
          label: st?.time || TIME_SLOT_LABEL(s.timeSlot),
          freeSpots: s.freeSpots,
        };
      });
    if (timeSlots.length) {
      days.push({
        day,
        date: sd?.date || null,
        label: dateLabel || STAGE_DAY_LABEL(day),
        timeSlots,
      });
    }
  }
  return { days };
};
