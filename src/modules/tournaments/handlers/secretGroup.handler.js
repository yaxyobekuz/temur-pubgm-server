import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

export const setSecretGroup = asyncHandler(async (req, res) => {
  const t = await service.setSecretGroup(req.params.id, req.body);
  res.json({ success: true, data: t, message: "Maxfiy guruh saqlandi" });
});

export const clearSecretGroup = asyncHandler(async (req, res) => {
  const t = await service.clearSecretGroup(req.params.id);
  res.json({ success: true, data: t, message: "Maxfiy guruh olib tashlandi" });
});
