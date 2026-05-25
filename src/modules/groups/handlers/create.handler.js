import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/groups.service.js";

const create = asyncHandler(async (req, res) => {
  const g = await service.create(req.body);
  res.status(201).json({ success: true, data: g, message: "Guruh yaratildi" });
});

export default create;
