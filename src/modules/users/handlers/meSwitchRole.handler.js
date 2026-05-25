import asyncHandler from "../../../middleware/asyncHandler.js";
import * as usersService from "../services/users.service.js";

const meSwitchRole = asyncHandler(async (req, res) => {
  const user = await usersService.switchSelfRole(req.user, req.body.newRole);
  res.json({ success: true, data: user, message: "Rol almashtirildi" });
});

export default meSwitchRole;
