import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/broadcasts.service.js";

const getById = asyncHandler(async (req, res) => {
  const job = await service.getById(req.params.id);
  res.json({ success: true, data: job });
});

export default getById;
