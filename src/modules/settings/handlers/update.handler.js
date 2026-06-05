import asyncHandler from "../../../middleware/asyncHandler.js";
import * as settingsService from "../services/settings.service.js";

const update = asyncHandler(async (req, res) => {
  const data = await settingsService.update(req.body);
  res.json({ success: true, data, message: "Saqlandi" });
});

export default update;
