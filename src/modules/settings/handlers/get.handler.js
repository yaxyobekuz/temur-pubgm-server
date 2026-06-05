import asyncHandler from "../../../middleware/asyncHandler.js";
import * as settingsService from "../services/settings.service.js";

const get = asyncHandler(async (_req, res) => {
  const data = await settingsService.get();
  res.json({ success: true, data });
});

export default get;
