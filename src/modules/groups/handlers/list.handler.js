import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/groups.service.js";

const list = asyncHandler(async (req, res) => {
  const items = await service.listByStage(req.query.stageId);
  res.json({ success: true, data: items });
});

export default list;
