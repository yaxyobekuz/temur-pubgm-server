import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/matches.service.js";

const update = asyncHandler(async (req, res) => {
  const m = await service.update(req.params.id, req.body);
  res.json({ success: true, data: m, message: "Saqlandi" });
});

export default update;
