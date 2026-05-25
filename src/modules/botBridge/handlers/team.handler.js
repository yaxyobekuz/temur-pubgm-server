import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

export const getTeam = asyncHandler(async (req, res) => {
  const team = await botBridge.getMyTeam(req.query.tgId);
  res.json({ success: true, data: team });
});

export const createTeam = asyncHandler(async (req, res) => {
  const team = await botBridge.createTeam(req.body.tgId, req.body);
  res.status(201).json({ success: true, data: team, message: "Komanda yaratildi" });
});

export const updateTeam = asyncHandler(async (req, res) => {
  const team = await botBridge.updateOwnTeam(req.body.tgId, req.body);
  res.json({ success: true, data: team, message: "Saqlandi" });
});

export const regenerateInvite = asyncHandler(async (req, res) => {
  const team = await botBridge.regenerateOwnInvite(req.body.tgId);
  res.json({ success: true, data: team, message: "Taklif kodi yangilandi" });
});

export const kickMember = asyncHandler(async (req, res) => {
  const team = await botBridge.kickFromOwnTeam(req.body.tgId, req.body.memberId);
  res.json({ success: true, data: team, message: "O'yinchi chiqarildi" });
});

export const leaveTeam = asyncHandler(async (req, res) => {
  await botBridge.leaveTeam(req.body.tgId);
  res.json({ success: true, message: "Komandadan chiqildi" });
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const team = await botBridge.acceptInvite(req.body.tgId, req.body.inviteCode);
  res.json({ success: true, data: team, message: "Komandaga qo'shildingiz" });
});
