import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/broadcasts.service.js";

const cancel = asyncHandler(async (req, res) => {
  const job = await service.cancel(req.params.id);
  res.json({ success: true, data: job, message: "Bekor qilindi" });
});

export default cancel;
