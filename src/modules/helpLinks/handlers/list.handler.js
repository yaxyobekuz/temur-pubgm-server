import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/helpLinks.service.js";

const list = asyncHandler(async (_req, res) => {
  const items = await service.list();
  res.json({ success: true, data: items });
});

export default list;
