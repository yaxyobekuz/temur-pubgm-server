import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/broadcasts.service.js";

const create = asyncHandler(async (req, res) => {
  const job = await service.create(req.body, req.user);
  res.status(201).json({ success: true, data: job, message: "Xabarnoma navbatga qo'shildi" });
});

export default create;
