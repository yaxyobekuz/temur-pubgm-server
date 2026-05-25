import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/matches.service.js";

const standings = asyncHandler(async (req, res) => {
  const rows = await service.stageStandings(req.params.stageId);
  res.json({ success: true, data: rows });
});

export default standings;
