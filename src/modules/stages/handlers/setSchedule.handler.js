import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/stages.service.js";

const setSchedule = asyncHandler(async (req, res) => {
  const stage = await service.setSchedule(req.params.id, req.body.schedule);
  res.json({ success: true, data: stage, message: "Jadval saqlandi" });
});

export default setSchedule;
