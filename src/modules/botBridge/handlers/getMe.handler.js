import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

const getMe = asyncHandler(async (req, res) => {
  const user = await botBridge.getMe(req.query.tgId);
  res.json({ success: true, data: user });
});

export default getMe;
