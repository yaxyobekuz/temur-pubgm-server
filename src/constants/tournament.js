// Tournament status machine + allowed transitions.
export const TOURNAMENT_STATUS = Object.freeze({
  DRAFT: "draft",
  ANNOUNCED: "announced",
  REGISTRATION: "registration",
  STAGE_1: "stage1",
  STAGE_2: "stage2",
  FINAL: "final",
  FINISHED: "finished",
});

export const TOURNAMENT_STATUS_LABELS = Object.freeze({
  [TOURNAMENT_STATUS.DRAFT]: "Qoralama",
  [TOURNAMENT_STATUS.ANNOUNCED]: "E'lon qilindi",
  [TOURNAMENT_STATUS.REGISTRATION]: "Ro'yxatdan o'tish",
  [TOURNAMENT_STATUS.STAGE_1]: "1-bosqich",
  [TOURNAMENT_STATUS.STAGE_2]: "2-bosqich",
  [TOURNAMENT_STATUS.FINAL]: "Final",
  [TOURNAMENT_STATUS.FINISHED]: "Yakunlandi",
});

// Active states - used by Phase 3 active-tournament lock.
export const ACTIVE_TOURNAMENT_STATUSES = Object.freeze([
  TOURNAMENT_STATUS.REGISTRATION,
  TOURNAMENT_STATUS.STAGE_1,
  TOURNAMENT_STATUS.STAGE_2,
  TOURNAMENT_STATUS.FINAL,
]);

// Forward-only transitions. Owner can also jump to FINISHED at any point.
const STATUS_TRANSITIONS = {
  [TOURNAMENT_STATUS.DRAFT]: [TOURNAMENT_STATUS.ANNOUNCED, TOURNAMENT_STATUS.FINISHED],
  [TOURNAMENT_STATUS.ANNOUNCED]: [TOURNAMENT_STATUS.REGISTRATION, TOURNAMENT_STATUS.FINISHED],
  [TOURNAMENT_STATUS.REGISTRATION]: [TOURNAMENT_STATUS.STAGE_1, TOURNAMENT_STATUS.FINISHED],
  [TOURNAMENT_STATUS.STAGE_1]: [TOURNAMENT_STATUS.STAGE_2, TOURNAMENT_STATUS.FINISHED],
  [TOURNAMENT_STATUS.STAGE_2]: [TOURNAMENT_STATUS.FINAL, TOURNAMENT_STATUS.FINISHED],
  [TOURNAMENT_STATUS.FINAL]: [TOURNAMENT_STATUS.FINISHED],
  [TOURNAMENT_STATUS.FINISHED]: [],
};

export const canTransition = (from, to) =>
  (STATUS_TRANSITIONS[from] || []).includes(to);

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

export const STAGE_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  FINISHED: "finished",
});

export const STAGE_ORDER = Object.freeze({
  ONE: 1,
  TWO: 2,
  FINAL: "final",
});

export const ALL_STAGE_ORDERS = [
  STAGE_ORDER.ONE,
  STAGE_ORDER.TWO,
  STAGE_ORDER.FINAL,
];

// Default max teams per group (overridable per-stage).
export const DEFAULT_MAX_TEAMS_PER_GROUP = 20;
