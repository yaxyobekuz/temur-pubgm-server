import asyncHandler from "../../../middleware/asyncHandler.js";
import * as regionsService from "../services/regions.service.js";

const update = asyncHandler(async (req, res) => {
  const region = await regionsService.update(req.params.id, req.body);
  res.json({ success: true, data: region, message: "Saqlandi" });
});

export default update;
