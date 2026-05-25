// Tournament status machine + allowed transitions.
// Dinamik bosqichlar uchun stage1..stage9 enum (10 ta cheklov bilan).
const STAGE_KEYS = Array.from({ length: 9 }, (_, i) => [`STAGE_${i + 1}`, `stage${i + 1}`]);

export const TOURNAMENT_STATUS = Object.freeze({
  DRAFT: "draft",
  ANNOUNCED: "announced",
  REGISTRATION: "registration",
  ...Object.fromEntries(STAGE_KEYS),
  FINAL: "final",
  FINISHED: "finished",
});

export const TOURNAMENT_STATUS_LABELS = Object.freeze({
  [TOURNAMENT_STATUS.DRAFT]: "Qoralama",
  [TOURNAMENT_STATUS.ANNOUNCED]: "E'lon qilindi",
  [TOURNAMENT_STATUS.REGISTRATION]: "Ro'yxatdan o'tish",
  ...Object.fromEntries(STAGE_KEYS.map(([, v], i) => [v, `${i + 1}-bosqich`])),
  [TOURNAMENT_STATUS.FINAL]: "Final",
  [TOURNAMENT_STATUS.FINISHED]: "Yakunlandi",
});

const STAGE_STATUS_VALUES = STAGE_KEYS.map(([, v]) => v);

// Active states - used by Phase 3 active-tournament lock.
export const ACTIVE_TOURNAMENT_STATUSES = Object.freeze([
  TOURNAMENT_STATUS.REGISTRATION,
  ...STAGE_STATUS_VALUES,
  TOURNAMENT_STATUS.FINAL,
]);

// Return the stage number (1..9) embedded in a "stageN" status, or null.
export const stageNumberFromStatus = (status) => {
  const m = /^stage(\d+)$/.exec(status || "");
  return m ? Number(m[1]) : null;
};

// Build the status string for a given stage number; "final" if it is the last one.
export const stageStatusFor = (stageNumber, stagesCount) => {
  if (stageNumber < 1) return null;
  if (stageNumber > stagesCount) return null;
  if (stageNumber === stagesCount) return TOURNAMENT_STATUS.FINAL;
  return `stage${stageNumber}`;
};

// Forward transitions are computed dynamically from stagesCount.
// Owner can also jump to FINISHED from any non-terminal state.
export const allowedNextStatuses = (current, stagesCount = 3) => {
  if (current === TOURNAMENT_STATUS.FINISHED) return [];
  const FINISHED = TOURNAMENT_STATUS.FINISHED;
  if (current === TOURNAMENT_STATUS.DRAFT) return [TOURNAMENT_STATUS.ANNOUNCED, FINISHED];
  if (current === TOURNAMENT_STATUS.ANNOUNCED) return [TOURNAMENT_STATUS.REGISTRATION, FINISHED];
  if (current === TOURNAMENT_STATUS.REGISTRATION) {
    return [stageStatusFor(1, stagesCount), FINISHED].filter(Boolean);
  }
  if (current === TOURNAMENT_STATUS.FINAL) return [FINISHED];
  const n = stageNumberFromStatus(current);
  if (n !== null) {
    return [stageStatusFor(n + 1, stagesCount), FINISHED].filter(Boolean);
  }
  return [];
};

export const canTransition = (from, to, stagesCount = 3) =>
  allowedNextStatuses(from, stagesCount).includes(to);

export const TOURNAMENT_MODE = Object.freeze({
  SOLO: "solo",
  DUO: "duo",
  SQUAD: "squad",
});

// Per-mode active roster size (Phase 3 uses this to validate registration rosters).
export const MODE_ROSTER_SIZE = Object.freeze({
  [TOURNAMENT_MODE.SOLO]: 1,
  [TOURNAMENT_MODE.DUO]: 2,
  [TOURNAMENT_MODE.SQUAD]: 4,
});

export const DEFAULT_STAGES_COUNT = 3;
export const DEFAULT_GROUP_SIZE = 20;
export const MAX_STAGES_COUNT = 9;
