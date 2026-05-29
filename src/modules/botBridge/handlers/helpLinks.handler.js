import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

export const listHelpLinks = asyncHandler(async (_req, res) => {
  const items = await botBridge.listHelpLinks();
  res.json({ success: true, data: items });
});
