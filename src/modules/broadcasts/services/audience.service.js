import mongoose from "mongoose";
import User from "../../../models/user.model.js";
import TournamentRegistration, {
  REGISTRATION_STATUS,
} from "../../../models/tournamentRegistration.model.js";
import Group from "../../../models/group.model.js";
import { BROADCAST_TARGET } from "../../../models/broadcastJob.model.js";

// Returns the unique set of tgIds matching the target.
// Type semantics:
//   ALL        - every active user with a tgId
//   ROLE       - ids = role strings (e.g. ["player", "leader"])
//   REGION     - ids = Region ObjectIds
//   TOURNAMENT - ids = Tournament ObjectIds - leader + roster members of every registered team
export const resolveAudience = async ({ type, ids = [] }) => {
  const tgIds = new Set();

  if (type === BROADCAST_TARGET.ALL) {
    const users = await User.find({ tgId: { $exists: true, $ne: null }, isActive: true }, "tgId");
    users.forEach((u) => tgIds.add(u.tgId));
    return [...tgIds];
  }

  if (type === BROADCAST_TARGET.ROLE) {
    const roles = ids.filter(Boolean);
    if (!roles.length) return [];
    const users = await User.find(
      { role: { $in: roles }, tgId: { $exists: true, $ne: null }, isActive: true },
      "tgId",
    );
    users.forEach((u) => tgIds.add(u.tgId));
    return [...tgIds];
  }

  if (type === BROADCAST_TARGET.REGION) {
    const regionIds = ids.filter(Boolean).map((s) => new mongoose.Types.ObjectId(s));
    if (!regionIds.length) return [];
    const users = await User.find(
      { region: { $in: regionIds }, tgId: { $exists: true, $ne: null }, isActive: true },
      "tgId",
    );
    users.forEach((u) => tgIds.add(u.tgId));
    return [...tgIds];
  }

  if (type === BROADCAST_TARGET.TOURNAMENT) {
    const tournamentIds = ids.filter(Boolean).map((s) => new mongoose.Types.ObjectId(s));
    if (!tournamentIds.length) return [];
    const regs = await TournamentRegistration.find(
      { tournament: { $in: tournamentIds }, status: REGISTRATION_STATUS.REGISTERED },
      "roster",
    ).populate("roster.user", "tgId");
    for (const reg of regs) {
      for (const r of reg.roster || []) {
        if (r.user?.tgId) tgIds.add(r.user.tgId);
      }
    }
    return [...tgIds];
  }

  if (type === BROADCAST_TARGET.GROUP) {
    const groupIds = ids.filter(Boolean).map((s) => new mongoose.Types.ObjectId(s));
    if (!groupIds.length) return [];
    const groups = await Group.find({ _id: { $in: groupIds } }, "teams");
    const regIds = [...new Set(groups.flatMap((g) => (g.teams || []).map(String)))];
    if (!regIds.length) return [];
    const regs = await TournamentRegistration.find(
      { _id: { $in: regIds }, status: REGISTRATION_STATUS.REGISTERED },
      "roster",
    ).populate("roster.user", "tgId");
    for (const reg of regs) {
      for (const r of reg.roster || []) {
        if (r.user?.tgId) tgIds.add(r.user.tgId);
      }
    }
    return [...tgIds];
  }

  return [];
};
