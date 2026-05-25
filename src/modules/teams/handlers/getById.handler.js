import asyncHandler from "../../../middleware/asyncHandler.js";
import * as teamsService from "../services/teams.service.js";

const getById = asyncHandler(async (req, res) => {
  const team = await teamsService.getById(req.params.id);
  res.json({ success: true, data: team });
});

export default getById;
