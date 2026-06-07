// Tournament lifecycle status. draft = admin-only, registration closed (default on create).
// Stage progression (which "bosqich") is tracked separately via Tournament.currentStage.
export const TOURNAMENT_STATUS = Object.freeze({
  DRAFT: "draft",
  PENDING: "pending",
  ONGOING: "ongoing",
  FINISHED: "finished",
});

export const TOURNAMENT_STATUS_LABELS = Object.freeze({
  [TOURNAMENT_STATUS.DRAFT]: "Qoralama",
  [TOURNAMENT_STATUS.PENDING]: "Kutilmoqda",
  [TOURNAMENT_STATUS.ONGOING]: "Boshlandi",
  [TOURNAMENT_STATUS.FINISHED]: "Yakunlandi",
});

// Active = started but not finished. Used by the active-tournament lock (team/player locks, delete guard).
export const ACTIVE_TOURNAMENT_STATUSES = Object.freeze([TOURNAMENT_STATUS.ONGOING]);

// Any status can switch to any other (except itself). Validity is just "is a known status".
export const canTransition = (_from, to) =>
  Object.values(TOURNAMENT_STATUS).includes(to);

// For the status picker: everything except the current one.
export const allowedNextStatuses = (current) =>
  Object.values(TOURNAMENT_STATUS).filter((s) => s !== current);

export const TOURNAMENT_MODE = Object.freeze({
  SOLO: "solo",
  DUO: "duo",
  SQUAD: "squad",
});

// Per-mode active roster size (registration roster validation).
export const MODE_ROSTER_SIZE = Object.freeze({
  [TOURNAMENT_MODE.SOLO]: 1,
  [TOURNAMENT_MODE.DUO]: 2,
  [TOURNAMENT_MODE.SQUAD]: 4,
});

// Default PUBG Mobile map pool seeded into global settings on first creation.
// The owner edits this list on the Settings page; each tournament picks one map from it.
export const DEFAULT_MAPS = Object.freeze([
  "Erangel",
  "Miramar",
  "Sanhok",
  "Vikendi",
  "Livik",
  "Karakin",
]);

export const DEFAULT_STAGES_COUNT = 3;
export const DEFAULT_GROUP_SIZE = 20;
export const MAX_STAGES_COUNT = 9;

// How a team got into a group: normal registration, advanced from previous stage, or VIP slot.
export const TEAM_PLACEMENT_KIND = Object.freeze({
  NORMAL: "normal",
  ADVANCED: "advanced",
  VIP: "vip",
});

export const TEAM_PLACEMENT_KIND_LABELS = Object.freeze({
  [TEAM_PLACEMENT_KIND.NORMAL]: "Oddiy",
  [TEAM_PLACEMENT_KIND.ADVANCED]: "O'tgan",
  [TEAM_PLACEMENT_KIND.VIP]: "VIP",
});

// Fixed per-stage structure (1-based). Stage 1 = blueprint[0], etc.
// daysCount × timeSlotsPerDay × groupsPerTimeSlot groups, each up to maxTeamsPerGroup teams.
// advancePlaces = how many top places per group the admin promotes to the next stage.
export const STAGE_BLUEPRINTS = Object.freeze([
  { daysCount: 3, timeSlotsPerDay: 2, groupsPerTimeSlot: 3, maxTeamsPerGroup: 20, advancePlaces: 3 },
  { daysCount: 2, timeSlotsPerDay: 2, groupsPerTimeSlot: 2, maxTeamsPerGroup: 20, advancePlaces: 2 },
  { daysCount: 1, timeSlotsPerDay: 1, groupsPerTimeSlot: 1, maxTeamsPerGroup: 20, advancePlaces: 3 },
]);

// The final stage (a single group) blueprint, reused when stagesCount differs from 3.
const FINAL_BLUEPRINT = STAGE_BLUEPRINTS[STAGE_BLUEPRINTS.length - 1];

// Returns the blueprint for a stage by its order. The last stage (order === stagesCount)
// is always the single-group final; earlier stages map to STAGE_BLUEPRINTS, falling back
// to the second-stage shape when stagesCount is larger than the predefined list.
export const getStageBlueprint = (order, stagesCount = DEFAULT_STAGES_COUNT) => {
  if (order >= stagesCount) return { ...FINAL_BLUEPRINT };
  const bp = STAGE_BLUEPRINTS[order - 1] || STAGE_BLUEPRINTS[1];
  return { ...bp };
};

// Total team capacity of a stage from its config.
export const stageCapacity = ({ daysCount, timeSlotsPerDay, groupsPerTimeSlot, maxTeamsPerGroup }) =>
  daysCount * timeSlotsPerDay * groupsPerTimeSlot * maxTeamsPerGroup;

export const STAGE_DAY_LABEL = (day) => `${day}-kun`;
export const TIME_SLOT_LABEL = (timeSlot) => `${timeSlot}-vaqt`;
export const PLACE_LABEL = (place) => `${place}-o'rin`;

// Stage label by order number and total count (last order = "Final").
export const getStageLabel = (order, total) =>
  order === total ? "Final" : `${order}-bosqich`;
