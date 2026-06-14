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

export const setBannerFileId = asyncHandler(async (req, res) => {
  const data = await botBridge.setTournamentBannerFileId(req.params.id, req.body.fileId);
  res.json({ success: true, data });
});

export const register = asyncHandler(async (req, res) => {
  const reg = await botBridge.registerForTournament(
    req.body.tgId,
    req.params.id,
    req.body.roster,
    req.body.day,
    req.body.timeSlot,
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

export const openSlots = asyncHandler(async (req, res) => {
  const data = await botBridge.getOpenSlots(req.params.id);
  res.json({ success: true, data });
});

export const sponsorCheck = asyncHandler(async (req, res) => {
  const data = await botBridge.checkTeamSponsorMembership(req.query.tgId, req.params.id);
  res.json({ success: true, data });
});

export const selfSponsor = asyncHandler(async (req, res) => {
  const data = await botBridge.getSelfSponsorChannels(req.query.tgId, req.params.id);
  res.json({ success: true, data });
});

export const resendSponsorReminders = asyncHandler(async (req, res) => {
  const data = await botBridge.resendSponsorReminders(req.body.tgId);
  res.json({ success: true, data });
});

export const resendPlacementNotice = asyncHandler(async (req, res) => {
  const data = await botBridge.resendPlacementNotice(req.body.tgId);
  res.json({ success: true, data });
});

export const pendingPlacement = asyncHandler(async (req, res) => {
  const data = await botBridge.getPendingPlacement(req.query.tgId);
  res.json({ success: true, data });
});

export const placeIntoStage = asyncHandler(async (req, res) => {
  const reg = await botBridge.placeIntoStage(
    req.body.tgId,
    req.params.id,
    req.body.day,
    req.body.timeSlot,
    req.body.roster,
  );
  res.json({ success: true, data: reg, message: "Joy tanlandi" });
});
