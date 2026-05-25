import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const meKickMember = asyncHandler(async (req, res) => {
  const team = await teamsService.kickMember(req.user, req.params.userId);
  res.json({ success: true, data: team, message: "O'yinchi chiqarildi" });
});

export default meKickMember;
