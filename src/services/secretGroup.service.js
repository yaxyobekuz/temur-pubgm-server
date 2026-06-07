import ApiError from "../utils/ApiError.js";
import * as botClient from "./botClient.service.js";

// Secret group: per-group, mandatory. The leader must be a member of THIS group's private
// group before being placed into it. A group without a configured secret group blocks placement.
// Shared by every placement path (register, placeIntoStage, owner addTeam) so the rule stays
// uniform. Returns { ok: true } when the leader is a member, otherwise
// { ok: false, group: { title, url } } so callers can hand the join link back to the leader.
export const ensureSecretGroupMembership = async ({ group, leaderTgId }) => {
  const sg = group?.secretGroup;
  if (!sg || !sg.url || !sg.chatId) {
    throw new ApiError(400, "Bu guruh uchun maxfiy guruh sozlanmagan. Admin bilan bog'laning.");
  }
  if (!leaderTgId) return { ok: false, group: { title: sg.title, url: sg.url } };

  try {
    const map = await botClient.checkMembership({
      tgIds: [leaderTgId],
      chatIds: [sg.chatId],
    });
    const isMember = map?.[leaderTgId]?.[sg.chatId] === true;
    return isMember
      ? { ok: true }
      : { ok: false, group: { title: sg.title, url: sg.url } };
  } catch (err) {
    throw new ApiError(503, "Maxfiy guruhni tekshirib bo'lmadi (bot bilan aloqa yo'q)");
  }
};
