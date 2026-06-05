import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

export const getSettings = asyncHandler(async (_req, res) => {
  const data = await botBridge.getSettingsForBot();
  res.json({ success: true, data });
});
