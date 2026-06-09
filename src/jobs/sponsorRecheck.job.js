import Tournament from "../models/tournament.model.js";
import TournamentRegistration, {
  REGISTRATION_STATUS,
} from "../models/tournamentRegistration.model.js";
import { TOURNAMENT_STATUS } from "../constants/tournament.js";
import * as registrationsService from "../modules/registrations/services/registrations.service.js";
import * as notify from "../services/notify.service.js";
import * as botClient from "../services/botClient.service.js";
import logger from "../config/logger.js";

export const JOB_NAME = "recurring.sponsor-recheck";

// Yengil rate-limit: yuborishlar orasida kichik pauza (Telegram flood-limitidan saqlanish).
const SLEEP_MS = 40;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ro'yxatdan o'tgan jamoalarni davriy qayta tekshiradi: homiy (Telegram) kanaldan chiqib
// ketgan o'yinchilar bo'lsa - o'yinchining o'ziga, leaderga va (jamoa guruhga joylashtirilgan
// bo'lsa) maxfiy guruhga ogohlantirish yuboradi. Avtomatik chetlatish YO'Q - admin qo'lda hal qiladi.
const define = (agenda) => {
  agenda.define(JOB_NAME, async () => {
    const tournaments = await Tournament.find(
      { status: { $in: [TOURNAMENT_STATUS.PENDING, TOURNAMENT_STATUS.ONGOING] } },
      "title sponsorChannels",
    );

    let checkedRegs = 0;
    let warnedTeams = 0;

    for (const tournament of tournaments) {
      // TG homiy kanali yo'q turnirni tekshirishga hojat yo'q (social tekshirilmaydi).
      const hasTgChannel = (tournament.sponsorChannels || []).some((c) => c.type === "telegram");
      if (!hasTgChannel) continue;

      const social = registrationsService.socialSponsorChannels(tournament);

      const regs = await TournamentRegistration.find({
        tournament: tournament._id,
        status: REGISTRATION_STATUS.REGISTERED,
      })
        .populate("team", "name leader")
        .populate("roster.user", "tgId firstName lastName tgUsername")
        .populate("currentGroup", "secretGroup");

      for (const reg of regs) {
        const users = (reg.roster || []).map((r) => r.user).filter(Boolean);
        if (!users.length) continue;

        checkedRegs += 1;

        let left;
        try {
          left = await registrationsService.evaluateRosterSponsorMembership(tournament, users);
        } catch (err) {
          // Bot bilan aloqa yo'q - bu registratsiyani keyingi yurishga qoldiramiz.
          logger.warn(
            { err: err.message, tournament: String(tournament._id), registration: String(reg._id) },
            "sponsor-recheck: obunani tekshirib bo'lmadi",
          );
          continue;
        }

        if (!left.length) continue;
        warnedTeams += 1;

        const names = left.map((m) => `• ${m.name}`).join("\n");

        // 1) Har bir chiqib ketgan o'yinchiga DM (kanal tugmalari bilan).
        for (const m of left) {
          const display = [...m.missing, ...social];
          const { text, buttons } = registrationsService.buildSponsorReminderMessage(
            tournament,
            display,
          );
          await notify.notifyUser({ tgId: m.tgId, text, buttons });
          await sleep(SLEEP_MS);
        }

        // 2) Leaderga ogohlantirish (chiqib ketgan a'zolar ro'yxati bilan).
        const leader = await notify.resolveRecipient(reg.team?.leader);
        if (leader?.tgId) {
          const text =
            `⚠️ <b>${tournament.title}</b> turniri bo'yicha ogohlantirish.\n\n` +
            `Quyidagi a'zolar homiy kanal(lar)dan chiqib ketgan:\n<b>${names}</b>\n\n` +
            "Iltimos qayta obuna bo'lishlarini ta'minlang. Aks holda admin jamoangizni turnirdan chetlatishi mumkin.";
          await notify.notifyUser({ tgId: leader.tgId, text });
          await sleep(SLEEP_MS);
        }

        // 3) Jamoa guruhga joylashtirilgan bo'lsa - maxfiy guruhga ham xabar.
        const secretChatId = reg.currentGroup?.secretGroup?.chatId;
        if (secretChatId) {
          const text =
            `⚠️ <b>${reg.team?.name || "Jamoa"}</b> jamoasi a'zolari homiy kanal(lar)dan chiqib ketgan:\n` +
            `<b>${names}</b>\n\n` +
            "Iltimos qayta obuna bo'ling, aks holda turnirdan chetlatilishingiz mumkin.";
          try {
            await botClient.sendMessage({ chatId: secretChatId, text, parseMode: "HTML" });
          } catch (err) {
            logger.warn(
              { err: err.message, chatId: secretChatId, registration: String(reg._id) },
              "sponsor-recheck: maxfiy guruhga yuborib bo'lmadi",
            );
          }
          await sleep(SLEEP_MS);
        }
      }
    }

    logger.info({ checkedRegs, warnedTeams }, "Homiy kanal qayta tekshiruvi yakunlandi");
  });
};

export default define;
