import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/matches.service.js";

const setResults = asyncHandler(async (req, res) => {
  const m = await service.setResults(req.params.id, req.body.results);
  res.json({ success: true, data: m, message: "Natijalar saqlandi" });
});

export default setResults;
