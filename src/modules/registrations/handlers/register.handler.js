import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/registrations.service.js";

const register = asyncHandler(async (req, res) => {
  const r = await service.register({
    tournamentId: req.params.id,
    leaderUser: req.user,
    roster: req.body.roster,
  });
  res.status(201).json({
    success: true,
    data: r,
    message: "Turnirga ro'yxatdan o'tildi",
  });
});

export default register;
