import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

export const addSponsorChannel = asyncHandler(async (req, res) => {
  const t = await service.addSponsorChannel(req.params.id, req.body);
  res.status(201).json({ success: true, data: t, message: "Kanal qo'shildi" });
});

export const removeSponsorChannel = asyncHandler(async (req, res) => {
  const t = await service.removeSponsorChannel(req.params.id, req.params.channelId);
  res.json({ success: true, data: t, message: "Kanal olib tashlandi" });
});
