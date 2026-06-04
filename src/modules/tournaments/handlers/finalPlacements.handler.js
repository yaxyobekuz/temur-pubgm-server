import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const recordFinalPlacements = asyncHandler(async (req, res) => {
  const t = await service.recordFinalPlacements(req.params.id, req.body.placements, req.user);
  res.json({ success: true, data: t, message: "Final natijalari qayd etildi" });
});

export default recordFinalPlacements;
