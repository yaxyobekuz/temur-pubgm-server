import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const create = asyncHandler(async (req, res) => {
  const t = await service.create(req.body);
  res.status(201).json({ success: true, data: t, message: "Turnir yaratildi" });
});

export default create;
