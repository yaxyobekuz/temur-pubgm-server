import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const meCreate = asyncHandler(async (req, res) => {
  const team = await teamsService.createForLeader(req.user, req.body);
  res.status(201).json({ success: true, data: team, message: "Komanda yaratildi" });
});

export default meCreate;
