import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const meGet = asyncHandler(async (req, res) => {
  const team = await teamsService.getMyTeam(req.user._id);
  res.json({ success: true, data: team });
});

export default meGet;
