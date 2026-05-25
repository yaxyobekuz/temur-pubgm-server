import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

const switchRole = asyncHandler(async (req, res) => {
  const user = await botBridge.switchRole(req.body.tgId, req.body.newRole);
  res.json({ success: true, data: user, message: "Rol almashtirildi" });
});

export default switchRole;
