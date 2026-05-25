import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/groups.service.js";

const update = asyncHandler(async (req, res) => {
  const g = await service.update(req.params.id, req.body);
  res.json({ success: true, data: g, message: "Saqlandi" });
});

export default update;
