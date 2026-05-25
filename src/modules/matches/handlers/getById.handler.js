import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/matches.service.js";

const getById = asyncHandler(async (req, res) => {
  const m = await service.getById(req.params.id);
  res.json({ success: true, data: m });
});

export default getById;
