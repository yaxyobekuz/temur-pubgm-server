import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const meLeave = asyncHandler(async (req, res) => {
  await teamsService.leave(req.user);
  res.json({ success: true, message: "Komandadan chiqildi" });
});

export default meLeave;
