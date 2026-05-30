import mongoose from "mongoose";
import {
  TOURNAMENT_STATUS,
  TOURNAMENT_MODE,
  DEFAULT_STAGES_COUNT,
  MAX_STAGES_COUNT,
} from "../constants/tournament.js";

const sponsorChannelSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["telegram", "social"], required: true },
    title: { type: String, trim: true, required: true },
    url: { type: String, trim: true, required: true },
    // Telegram only: required for private channels; for public ones username is parsed from url.
    chatId: { type: String, trim: true, default: "" },
  },
  { _id: true, timestamps: false },
);

// Per-tournament private group the team leader must join before registering.
// chatId is auto-captured by the bot when it is made an admin (or entered manually).
const secretGroupSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: "" },
    chatId: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { _id: false },
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
    startDate: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(TOURNAMENT_STATUS),
      default: TOURNAMENT_STATUS.PENDING,
      index: true,
    },
    // Which stage (bosqich) the tournament is currently in; decoupled from status.
    currentStage: { type: Number, min: 1, default: 1 },
    sponsorChannels: [sponsorChannelSchema],
    secretGroup: { type: secretGroupSchema, default: () => ({}) },
    maps: [{ type: String, trim: true }],
    maxTeams: { type: Number, min: 1, default: 60 },
    stagesCount: {
      type: Number,
      min: 1,
      max: MAX_STAGES_COUNT,
      default: DEFAULT_STAGES_COUNT,
    },
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
