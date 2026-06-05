import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const openVip = asyncHandler(async (req, res) => {
  const t = await service.openVipSlot(
    req.params.id,
    { teamId: req.body.teamId, stageOrder: req.body.stageOrder },
    req.user,
  );
  res.json({ success: true, data: t, message: "VIP slot ochildi" });
});

export default openVip;
