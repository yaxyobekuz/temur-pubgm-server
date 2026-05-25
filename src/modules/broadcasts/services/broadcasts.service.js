import BroadcastJob, {
  BROADCAST_STATUS,
  BROADCAST_TARGET,
} from "../../../models/broadcastJob.model.js";
import ApiError from "../../../utils/ApiError.js";
import agenda from "../../../config/agenda.js";
import { resolveAudience } from "./audience.service.js";

const BROADCAST_JOB_NAME = "broadcast";

export const list = async ({ page = 1, limit = 20, status }) => {
  const filter = {};
  if (status) filter.status = status;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    BroadcastJob.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "firstName lastName username"),
    BroadcastJob.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

export const getById = async (id) => {
  const job = await BroadcastJob.findById(id).populate(
    "createdBy",
    "firstName lastName username",
  );
  if (!job) throw new ApiError(404, "Xabarnoma topilmadi");
  return job;
};

export const create = async (body, currentUser) => {
  if (!Object.values(BROADCAST_TARGET).includes(body.target?.type)) {
    throw new ApiError(400, "target.type noto'g'ri");
  }
  if (
    body.target.type !== BROADCAST_TARGET.ALL &&
    !(Array.isArray(body.target.ids) && body.target.ids.length)
  ) {
    throw new ApiError(400, "target.ids bo'sh bo'lishi mumkin emas");
  }

  // Resolve audience right now so the user sees the count before queueing.
  const audience = await resolveAudience(body.target);

  const job = await BroadcastJob.create({
    title: body.title.trim(),
    body: body.body || "",
    mediaUrl: body.mediaUrl || "",
    buttons: Array.isArray(body.buttons) ? body.buttons : [],
    target: { type: body.target.type, ids: body.target.ids || [] },
    scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    audienceSize: audience.length,
    createdBy: currentUser?._id || null,
  });

  const when = job.scheduledAt && job.scheduledAt > new Date() ? job.scheduledAt : "now";
  await agenda.schedule(when, BROADCAST_JOB_NAME, { jobId: job._id.toString() });

  return job;
};

export const cancel = async (id) => {
  const job = await getById(id);
  if (job.status === BROADCAST_STATUS.DONE || job.status === BROADCAST_STATUS.RUNNING) {
    throw new ApiError(400, "Yakunlangan yoki bajarilayotgan jobni bekor qilib bo'lmaydi");
  }
  job.status = BROADCAST_STATUS.CANCELED;
  await job.save();
  // Best-effort: remove pending Agenda jobs referencing this jobId.
  try {
    await agenda.cancel({
      name: BROADCAST_JOB_NAME,
      "data.jobId": id,
    });
  } catch {
    /* ignore - Agenda cleanup is opportunistic */
  }
  return job;
};

export const remove = async (id) => {
  const job = await getById(id);
  if (job.status === BROADCAST_STATUS.RUNNING) {
    throw new ApiError(400, "Bajarilayotgan jobni o'chirib bo'lmaydi");
  }
  await job.deleteOne();
};

export { BROADCAST_JOB_NAME };
