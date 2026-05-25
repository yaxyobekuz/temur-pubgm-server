import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/matches.service.js";

const list = asyncHandler(async (req, res) => {
  let items;
  if (req.query.tournament) {
    items = await service.listByTournament(req.query.tournament);
  } else if (req.query.stage) {
    items = await service.listByStage(req.query.stage);
  } else if (req.query.group) {
    items = await service.listByGroup(req.query.group);
  } else {
    return res
      .status(400)
      .json({ success: false, message: "tournament/stage/group kerak" });
  }
  res.json({ success: true, data: items });
});

export default list;
