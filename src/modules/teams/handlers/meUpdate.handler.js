import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const meUpdate = asyncHandler(async (req, res) => {
  const team = await teamsService.updateOwn(req.user, req.body);
  res.json({ success: true, data: team, message: "Saqlandi" });
});

export default meUpdate;
