import mongoose from "mongoose";
import { TEAM_PLACEMENT_KIND } from "../constants/tournament.js";

export const REGISTRATION_STATUS = Object.freeze({
  REGISTERED: "registered",
  KICKED: "kicked",
  DQ: "dq",
});

export const ROSTER_SLOT = Object.freeze({
  MAIN: "main",
  RESERVE: "reserve",
});

const rosterEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    slot: {
      type: String,
      enum: Object.values(ROSTER_SLOT),
      required: true,
    },
    position: { type: Number, default: 0 },
  },
  { _id: true, timestamps: false },
);

const registrationSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(REGISTRATION_STATUS),
      default: REGISTRATION_STATUS.REGISTERED,
      index: true,
    },
    roster: [rosterEntrySchema],
    currentGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    // Stage progression: eligibleStage = highest stage order the team may enter (1 on register,
    // bumped on promote/VIP). placedStage = stage order the team is currently placed into a group of.
    // eligibleStage > placedStage means the team must still pick a day+time slot via the bot.
    eligibleStage: { type: Number, min: 1, default: 1 },
    placedStage: { type: Number, min: 0, default: 0 },
    // How the next pending placement should be tagged (advanced vs vip).
    nextPlacementKind: {
      type: String,
      enum: Object.values(TEAM_PLACEMENT_KIND),
      default: TEAM_PLACEMENT_KIND.NORMAL,
    },
    registeredAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

registrationSchema.index({ tournament: 1, team: 1 }, { unique: true });
registrationSchema.index({ team: 1, status: 1 });

registrationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const TournamentRegistration = mongoose.model(
  "TournamentRegistration",
  registrationSchema,
);

export default TournamentRegistration;
