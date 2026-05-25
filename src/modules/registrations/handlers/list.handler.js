import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/registrations.service.js";

const list = asyncHandler(async (req, res) => {
  if (req.query.team) {
    const items = await service.listByTeam(req.query.team);
    return res.json({ success: true, data: items });
  }
  if (!req.query.tournament) {
    return res.status(400).json({ success: false, message: "tournament yoki team kerak" });
  }
  const items = await service.listByTournament({
    tournamentId: req.query.tournament,
    status: req.query.status,
  });
  res.json({ success: true, data: items });
});

export default list;
