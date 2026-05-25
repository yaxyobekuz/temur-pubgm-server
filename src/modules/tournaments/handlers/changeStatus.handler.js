import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const changeStatus = asyncHandler(async (req, res) => {
  const t = await service.changeStatus(req.params.id, req.body.next, req.user);
  res.json({ success: true, data: t, message: "Status yangilandi" });
});

export default changeStatus;
