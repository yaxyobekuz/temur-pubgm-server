import asyncHandler from "../../../middleware/asyncHandler.js";
import * as regionsService from "../services/regions.service.js";

const create = asyncHandler(async (req, res) => {
  const region = await regionsService.create(req.body);
  res.status(201).json({ success: true, data: region, message: "Mintaqa yaratildi" });
});

export default create;
