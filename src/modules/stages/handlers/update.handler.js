import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/stages.service.js";

const update = asyncHandler(async (req, res) => {
  const stage = await service.update(req.params.id, req.body);
  res.json({ success: true, data: stage, message: "Saqlandi" });
});

export default update;
