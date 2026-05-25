import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/matches.service.js";

const create = asyncHandler(async (req, res) => {
  const m = await service.create(req.body);
  res.status(201).json({ success: true, data: m, message: "Match yaratildi" });
});

export default create;
