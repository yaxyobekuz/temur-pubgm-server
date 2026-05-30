import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

export const listTournaments = asyncHandler(async (_req, res) => {
  const items = await botBridge.listOpenTournaments();
  res.json({ success: true, data: items });
});

export const getTournament = asyncHandler(async (req, res) => {
  const t = await botBridge.getTournamentForBot(req.params.id);
  res.json({ success: true, data: t });
});

export const register = asyncHandler(async (req, res) => {
  const reg = await botBridge.registerForTournament(
    req.body.tgId,
    req.params.id,
    req.body.roster,
  );
  res.status(201).json({
    success: true,
    data: reg,
    message: "Turnirga ro'yxatdan o'tildi",
  });
});

export const myRegistrations = asyncHandler(async (req, res) => {
  const items = await botBridge.myRegistrations(req.query.tgId);
  res.json({ success: true, data: items });
});

export const resolveSecretGroup = asyncHandler(async (req, res) => {
  const t = await botBridge.resolveSecretGroup(req.body);
  res.json({ success: true, data: { matched: !!t } });
});
