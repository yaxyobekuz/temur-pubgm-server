import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/registrations.service.js";

const getById = asyncHandler(async (req, res) => {
  const r = await service.getById(req.params.id);
  res.json({ success: true, data: r });
});

export default getById;
