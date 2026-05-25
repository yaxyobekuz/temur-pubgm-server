import mongoose from "mongoose";
import {
  TOURNAMENT_STATUS,
  TOURNAMENT_MODE,
} from "../constants/tournament.js";

const sponsorChannelSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["telegram", "social"], required: true },
    title: { type: String, trim: true, required: true },
    url: { type: String, trim: true, required: true },
    // Telegram-only: numeric chat id (resolved via bot getChat). Required for membership checks.
    chatId: { type: String, trim: true, default: "" },
    // Optional @username form (e.g. "@pubgmofficial"), if owner pasted it.
    chatUsername: { type: String, trim: true, default: "" },
  },
  { _id: true, timestamps: false },
);

const tournamentSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    slug: { type: String, trim: true, unique: true, required: true, lowercase: true },
    banner: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    prizePool: { type: String, trim: true, default: "" },
    mode: {
      type: String,
      enum: Object.values(TOURNAMENT_MODE),
      required: true,
    },
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region", default: null },
    startDate: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(TOURNAMENT_STATUS),
      default: TOURNAMENT_STATUS.DRAFT,
      index: true,
    },
    sponsorChannels: [sponsorChannelSchema],
    maps: [{ type: String, trim: true }],
    maxTeams: { type: Number, min: 1, default: 60 },
  },
  { timestamps: true },
);

tournamentSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Tournament = mongoose.model("Tournament", tournamentSchema);

export default Tournament;
