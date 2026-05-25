import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const update = asyncHandler(async (req, res) => {
  const t = await service.update(req.params.id, req.body);
  res.json({ success: true, data: t, message: "Saqlandi" });
});

export default update;
