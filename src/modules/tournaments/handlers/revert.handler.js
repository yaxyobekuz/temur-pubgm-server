import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const revert = asyncHandler(async (req, res) => {
  const t = await service.revertToPreviousStage(req.params.id, req.user);
  res.json({ success: true, data: t, message: "Oldingi bosqichga qaytarildi" });
});

export default revert;
