import agenda from "../config/agenda.js";
import logger from "../config/logger.js";
import defineCleanupExpiredTokens, {
  JOB_NAME as CLEANUP_JOB,
} from "./cleanupExpiredTokens.job.js";
import defineBroadcast from "./broadcast.job.js";
import defineSponsorRecheck, {
  JOB_NAME as SPONSOR_RECHECK_JOB,
} from "./sponsorRecheck.job.js";

export const startJobs = async () => {
  defineCleanupExpiredTokens(agenda);
  defineBroadcast(agenda);
  defineSponsorRecheck(agenda);

  await agenda.start();

  await agenda.every("0 3 * * *", CLEANUP_JOB);
  // Kuniga 2 marta (10:00 va 22:00, Toshkent vaqti) homiy kanal obunasini qayta tekshiradi.
  await agenda.every("0 10,22 * * *", SPONSOR_RECHECK_JOB, {}, { timezone: "Asia/Tashkent" });

  logger.info("Agenda ishga tushirildi");
};

export const stopJobs = async () => {
  await agenda.stop();
  logger.info("Agenda to'xtatildi");
};
