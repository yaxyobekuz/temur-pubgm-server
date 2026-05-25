import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/stages.service.js";

const promote = asyncHandler(async (req, res) => {
  const group = await service.promote(req.params.id, req.body);
  res.json({ success: true, data: group, message: "Komandalar bosqichga taqsimlandi" });
});

export default promote;
