import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/helpLinks.service.js";

const update = asyncHandler(async (req, res) => {
  const link = await service.update(req.params.id, req.body);
  res.json({ success: true, data: link, message: "Havola yangilandi" });
});

export default update;
