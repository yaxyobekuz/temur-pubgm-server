import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/groups.service.js";

const addTeam = asyncHandler(async (req, res) => {
  const g = await service.addTeam(req.params.id, req.body.teamId);
  res.json({ success: true, data: g, message: "Komanda guruhga qo'shildi" });
});

export default addTeam;
