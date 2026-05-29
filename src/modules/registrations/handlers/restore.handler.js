import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/registrations.service.js";

const restore = asyncHandler(async (req, res) => {
  const r = await service.restore(req.params.id);
  res.json({ success: true, data: r, message: "Komanda turnirga qaytarildi" });
});

export default restore;
