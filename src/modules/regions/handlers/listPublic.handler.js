import asyncHandler from "../../../middleware/asyncHandler.js";
import * as regionsService from "../services/regions.service.js";

const listPublic = asyncHandler(async (_req, res) => {
  const items = await regionsService.listPublic();
  res.json({ success: true, data: items });
});

export default listPublic;
