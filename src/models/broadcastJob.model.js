import mongoose from "mongoose";

export const BROADCAST_STATUS = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
  CANCELED: "canceled",
});

export const BROADCAST_TARGET = Object.freeze({
  ALL: "all",
  ROLE: "role",
  REGION: "region",
  TOURNAMENT: "tournament",
  GROUP: "group",
  TEAM: "team",
  USER: "user",
});

const buttonSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false },
);

// Renamed from `errors` to `failures` - `errors` is a reserved Mongoose schema path.
const failureSchema = new mongoose.Schema(
  {
    tgId: { type: Number },
    reason: { type: String },
  },
  { _id: false, timestamps: false },
);

const broadcastJobSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    body: { type: String, trim: true, default: "" },
    mediaUrl: { type: String, trim: true, default: "" },
    buttons: { type: [buttonSchema], default: [] },

    target: {
      type: {
        type: String,
        enum: Object.values(BROADCAST_TARGET),
        required: true,
      },
      ids: { type: [String], default: [] }, // ObjectIds OR role strings depending on `type`
    },

    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(BROADCAST_STATUS),
      default: BROADCAST_STATUS.QUEUED,
      index: true,
    },

    audienceSize: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    failures: { type: [failureSchema], default: [] },

    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

broadcastJobSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const BroadcastJob = mongoose.model("BroadcastJob", broadcastJobSchema);

export default BroadcastJob;
