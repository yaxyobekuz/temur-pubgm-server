// Tournament lifecycle status - 3 simple states, freely switchable.
// Stage progression (which "bosqich") is tracked separately via Tournament.currentStage.
export const TOURNAMENT_STATUS = Object.freeze({
  PENDING: "pending",
  ONGOING: "ongoing",
  FINISHED: "finished",
});

export const TOURNAMENT_STATUS_LABELS = Object.freeze({
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

export const DEFAULT_STAGES_COUNT = 3;
export const DEFAULT_GROUP_SIZE = 20;
export const MAX_STAGES_COUNT = 9;
