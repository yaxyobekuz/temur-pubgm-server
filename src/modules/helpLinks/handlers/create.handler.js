import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/helpLinks.service.js";

const create = asyncHandler(async (req, res) => {
  const link = await service.create(req.body);
  res.status(201).json({ success: true, data: link, message: "Havola qo'shildi" });
});

export default create;
