import mongoose from "mongoose";

export const MATCH_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
});

const resultSchema = new mongoose.Schema(
  {
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TournamentRegistration",
      required: true,
    },
    place: { type: Number, min: 1, default: null },
    kills: { type: Number, min: 0, default: 0 },
    points: { type: Number, min: 0, default: 0 },
    finishedAt: { type: Date, default: null },
  },
  { _id: false, timestamps: false },
);

const matchSchema = new mongoose.Schema(
  {
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
      required: true,
      index: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    order: { type: Number, min: 1, required: true },
    map: { type: String, trim: true, default: "" },
    startAt: { type: Date, default: null },
    roomId: { type: String, trim: true, default: "" },
    roomPassword: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: Object.values(MATCH_STATUS),
      default: MATCH_STATUS.SCHEDULED,
      index: true,
    },
    results: { type: [resultSchema], default: [] },
  },
  { timestamps: true },
);

matchSchema.index({ group: 1, order: 1 }, { unique: true });

matchSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Match = mongoose.model("Match", matchSchema);

export default Match;
