import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/tournaments.service.js";

const promote = asyncHandler(async (req, res) => {
  const t = await service.promoteToNext(req.params.id, req.body.teamIds, req.user);
  res.json({ success: true, data: t, message: "Keyingi bosqichga o'tildi" });
});

export default promote;
