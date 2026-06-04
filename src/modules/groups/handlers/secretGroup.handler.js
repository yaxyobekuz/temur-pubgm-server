import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/groups.service.js";

export const setSecretGroup = asyncHandler(async (req, res) => {
  const g = await service.setSecretGroup(req.params.id, req.body);
  res.json({ success: true, data: g, message: "Maxfiy guruh saqlandi" });
});

export const clearSecretGroup = asyncHandler(async (req, res) => {
  const g = await service.clearSecretGroup(req.params.id);
  res.json({ success: true, data: g, message: "Maxfiy guruh olib tashlandi" });
});
