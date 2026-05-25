import BroadcastJob, {
  BROADCAST_STATUS,
} from "../models/broadcastJob.model.js";
import { resolveAudience } from "../modules/broadcasts/services/audience.service.js";
import { BROADCAST_JOB_NAME } from "../modules/broadcasts/services/broadcasts.service.js";
import * as botClient from "../services/botClient.service.js";
import logger from "../config/logger.js";

export const JOB_NAME = BROADCAST_JOB_NAME;

// Rate limit: ~30 msg/sec to stay under Telegram's global cap.
const MAX_PER_SECOND = 30;
const SLEEP_MS = Math.ceil(1000 / MAX_PER_SECOND); // ~33ms

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const define = (agenda) => {
  agenda.define(JOB_NAME, async (job) => {
    const jobId = job.attrs.data?.jobId;
    if (!jobId) return;

    const broadcast = await BroadcastJob.findById(jobId);
    if (!broadcast) {
      logger.warn({ jobId }, "Broadcast job topilmadi");
      return;
    }
    if (broadcast.status === BROADCAST_STATUS.CANCELED) return;
    if (
      broadcast.status === BROADCAST_STATUS.DONE ||
      broadcast.status === BROADCAST_STATUS.RUNNING
    ) {
      return;
    }

    broadcast.status = BROADCAST_STATUS.RUNNING;
    broadcast.startedAt = new Date();
    broadcast.sentCount = 0;
    broadcast.failedCount = 0;
    broadcast.failures = [];
    await broadcast.save();

    let audience = [];
    try {
      audience = await resolveAudience(broadcast.target);
      broadcast.audienceSize = audience.length;
      await broadcast.save();
    } catch (err) {
      logger.error({ err: err.message, jobId }, "Audience resolve xato");
      broadcast.status = BROADCAST_STATUS.FAILED;
      broadcast.finishedAt = new Date();
      await broadcast.save();
      return;
    }

    const payload = {
      text: broadcast.body,
      mediaUrl: broadcast.mediaUrl || undefined,
      buttons: broadcast.buttons,
      parseMode: "HTML",
    };

    for (let i = 0; i < audience.length; i += 1) {
      const tgId = audience[i];

      // Re-check cancel between sends.
      if ((i & 31) === 0) {
        const fresh = await BroadcastJob.findById(jobId, "status");
        if (fresh?.status === BROADCAST_STATUS.CANCELED) {
          broadcast.status = BROADCAST_STATUS.CANCELED;
          broadcast.finishedAt = new Date();
          await broadcast.save();
          return;
        }
      }

      try {
        await botClient.sendMessage({ chatId: tgId, ...payload });
        broadcast.sentCount += 1;
      } catch (err) {
        broadcast.failedCount += 1;
        broadcast.failures.push({ tgId, reason: err.message?.slice(0, 200) || "unknown" });
      }

      // Persist progress every 50 sends so the UI can show movement.
      if (i % 50 === 49) {
        await broadcast.save();
      }
      await sleep(SLEEP_MS);
    }

    broadcast.status = BROADCAST_STATUS.DONE;
    broadcast.finishedAt = new Date();
    await broadcast.save();
    logger.info(
      { jobId, sent: broadcast.sentCount, failed: broadcast.failedCount },
      "Broadcast yakunlandi",
    );
  });
};

export default define;
