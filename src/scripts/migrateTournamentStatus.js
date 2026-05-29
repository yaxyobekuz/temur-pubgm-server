import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import Tournament from "../models/tournament.model.js";
import { TOURNAMENT_STATUS } from "../constants/tournament.js";
import logger from "../config/logger.js";

// One-off: map old 8-status scheme onto the new 3-status lifecycle.
//   draft | announced | registration -> pending
//   stage1..stage9 | final            -> ongoing (currentStage derived from old status)
//   finished                          -> finished
// Uses the native collection to bypass the new enum validation on read.
const STATUS_MAP = {
  draft: TOURNAMENT_STATUS.PENDING,
  announced: TOURNAMENT_STATUS.PENDING,
  registration: TOURNAMENT_STATUS.PENDING,
  final: TOURNAMENT_STATUS.ONGOING,
  finished: TOURNAMENT_STATUS.FINISHED,
};

const stageOrder = (oldStatus, stagesCount = 3) => {
  if (oldStatus === "final") return stagesCount;
  const m = /^stage(\d+)$/.exec(oldStatus || "");
  return m ? Number(m[1]) : 1;
};

const migrate = async () => {
  await connectDB();
  const col = Tournament.collection;
  const docs = await col.find({}).toArray();

  let changed = 0;
  for (const d of docs) {
    const old = d.status;
    let next = STATUS_MAP[old];
    let currentStage = d.currentStage || 1;

    if (!next) {
      // stageN -> ongoing, remember which stage.
      if (/^stage\d+$/.test(old || "")) {
        next = TOURNAMENT_STATUS.ONGOING;
        currentStage = stageOrder(old, d.stagesCount);
      } else if (Object.values(TOURNAMENT_STATUS).includes(old)) {
        next = old; // already migrated
      } else {
        next = TOURNAMENT_STATUS.PENDING;
      }
    }

    if (next !== old || currentStage !== d.currentStage) {
      await col.updateOne(
        { _id: d._id },
        { $set: { status: next, currentStage } },
      );
      changed += 1;
    }
  }

  logger.info(`Tournament status migration: ${changed}/${docs.length} yangilandi`);
  await disconnectDB();
};

migrate().catch((err) => {
  logger.error({ err }, "Tournament status migration xato");
  process.exit(1);
});
