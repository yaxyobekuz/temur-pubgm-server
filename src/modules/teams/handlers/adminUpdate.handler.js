import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const adminUpdate = asyncHandler(async (req, res) => {
  const team = await teamsService.adminUpdate(req.params.id, req.body);
  res.json({ success: true, data: team, message: "Saqlandi" });
});

export default adminUpdate;
