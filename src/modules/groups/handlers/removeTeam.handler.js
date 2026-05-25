import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/groups.service.js";

const removeTeam = asyncHandler(async (req, res) => {
  const g = await service.removeTeam(req.params.id, req.params.teamId);
  res.json({ success: true, data: g, message: "Komanda guruhdan chiqarildi" });
});

export default removeTeam;
