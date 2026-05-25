import asyncHandler from "../../../middleware/asyncHandler.js";
import * as regionsService from "../services/regions.service.js";

const getById = asyncHandler(async (req, res) => {
  const region = await regionsService.getById(req.params.id);
  res.json({ success: true, data: region });
});

export default getById;
