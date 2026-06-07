import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

// GET /bot/groups/teams-by-chat?chatId=... - teams placed into the group wired to this secret chat.
export const secretGroupTeams = asyncHandler(async (req, res) => {
  const data = await botBridge.getSecretGroupTeams(req.query.chatId);
  res.json({ success: true, data });
});
