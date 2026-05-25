import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const meRegenerateInvite = asyncHandler(async (req, res) => {
  const team = await teamsService.regenerateInvite(req.user);
  res.json({ success: true, data: team, message: "Taklif kodi yangilandi" });
});

export default meRegenerateInvite;
