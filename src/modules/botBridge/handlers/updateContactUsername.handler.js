import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

const updateContactUsername = asyncHandler(async (req, res) => {
  const user = await botBridge.updateContactUsername(
    req.body.tgId,
    req.body.contactUsername,
  );
  res.json({ success: true, data: user, message: "Saqlandi" });
});

export default updateContactUsername;
