import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const getById = asyncHandler(async (req, res) => {
  const t = await service.getById(req.params.id);
  res.json({ success: true, data: t });
});

export default getById;
