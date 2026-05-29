import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

const switchRegion = asyncHandler(async (req, res) => {
  const user = await botBridge.switchRegion(req.body.tgId, req.body.regionId);
  res.json({ success: true, data: user, message: "Mintaqa almashtirildi" });
});

export default switchRegion;
