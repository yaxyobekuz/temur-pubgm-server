import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const openVip = asyncHandler(async (req, res) => {
  const t = await service.openVipSlot(req.params.id, req.body.registrationId, req.user);
  res.json({ success: true, data: t, message: "VIP slot ochildi" });
});

export default openVip;
