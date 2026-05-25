import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const adminRemove = asyncHandler(async (req, res) => {
  await teamsService.adminRemove(req.params.id);
  res.json({ success: true, message: "O'chirildi" });
});

export default adminRemove;
