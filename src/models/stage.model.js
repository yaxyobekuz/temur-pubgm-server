import mongoose from "mongoose";
import { STAGE_STATUS, ALL_STAGE_ORDERS, DEFAULT_MAX_TEAMS_PER_GROUP } from "../constants/tournament.js";

// `order` stores 1, 2, or the string "final".
const stageSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: (v) => ALL_STAGE_ORDERS.includes(v),
        message: "Bosqich tartibi noto'g'ri",
      },
    },
    status: {
      type: String,
      enum: Object.values(STAGE_STATUS),
      default: STAGE_STATUS.PENDING,
    },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    maxGroups: { type: Number, min: 1, default: 3 },
    maxTeamsPerGroup: { type: Number, min: 1, default: DEFAULT_MAX_TEAMS_PER_GROUP },
  },
  { timestamps: true },
);

stageSchema.index({ tournament: 1, order: 1 }, { unique: true });

stageSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Stage = mongoose.model("Stage", stageSchema);

export default Stage;
