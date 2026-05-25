import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/registrations.service.js";

const kick = asyncHandler(async (req, res) => {
  const r = await service.kick(req.params.id);
  res.json({ success: true, data: r, message: "Komanda turnirdan chiqarildi" });
});

export default kick;
