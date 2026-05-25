import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/stages.service.js";

const create = asyncHandler(async (req, res) => {
  const stage = await service.create(req.body);
  res.status(201).json({ success: true, data: stage, message: "Bosqich yaratildi" });
});

export default create;
