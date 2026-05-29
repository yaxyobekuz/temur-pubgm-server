import asyncHandler from "../../../middleware/asyncHandler.js";
import * as usersService from "../services/users.service.js";

const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateSelfProfile(req.user._id, req.body);
  res.json({ success: true, data: user, message: "Saqlandi" });
});

export default updateMe;
