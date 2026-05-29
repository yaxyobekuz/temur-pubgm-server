import asyncHandler from "../../../middleware/asyncHandler.js";
import * as usersService from "../services/users.service.js";

const changePassword = asyncHandler(async (req, res) => {
  await usersService.changeOwnPassword(req.user._id, req.body);
  res.json({ success: true, message: "Parol yangilandi" });
});

export default changePassword;
