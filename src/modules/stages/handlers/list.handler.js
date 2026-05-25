import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/stages.service.js";

const list = asyncHandler(async (req, res) => {
  const items = await service.listByTournament(req.query.tournamentId);
  res.json({ success: true, data: items });
});

export default list;
