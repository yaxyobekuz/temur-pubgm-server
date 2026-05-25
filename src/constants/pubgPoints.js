// Standard PUBG Mobile competitive scoring (PMGC/PMPL style).
// Per match: placement points + 1 point per kill.
const PLACEMENT_POINTS = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 2,
  8: 1,
  9: 1,
  10: 1,
  11: 1,
  12: 1,
};

export const placementPoints = (place) => {
  const n = Number(place);
  if (!Number.isFinite(n) || n < 1) return 0;
  return PLACEMENT_POINTS[n] || 0;
};

export const computeMatchPoints = ({ place, kills }) => {
  const placePts = placementPoints(place);
  const killPts = Math.max(0, Number(kills) || 0);
  return placePts + killPts;
};

export const POINTS_TABLE = PLACEMENT_POINTS;
