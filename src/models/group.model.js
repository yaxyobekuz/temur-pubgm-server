import mongoose from "mongoose";
import { DEFAULT_GROUP_SIZE, TEAM_PLACEMENT_KIND } from "../constants/tournament.js";

// Per-group private group the team leader must join before being placed into this group.
// chatId is read via the bot's /id command. Configured per day/time/group by the admin.
const secretGroupSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: "" },
    chatId: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { _id: false },
);

// One placed team inside a group. `registration` -> TournamentRegistration._id.
// `kind` records how the team got here (normal / advanced / vip) for display & stats.
const groupTeamSchema = new mongoose.Schema(
  {
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TournamentRegistration",
      required: true,
    },
    kind: {
      type: String,
      enum: Object.values(TEAM_PLACEMENT_KIND),
      default: TEAM_PLACEMENT_KIND.NORMAL,
    },
    // Final natija: admin 1/2/3 qayd etgach to'ldiriladi; aks holda null. Doimiy saqlanadi.
    placement: { type: Number, enum: [1, 2, 3], default: null },
  },
  { _id: false },
);

const groupSchema = new mongoose.Schema(
  {
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
      required: true,
      index: true,
    },
    code: { type: String, trim: true, uppercase: true, required: true },
    // Day/timeSlot place the group in the schedule; date/time labels live on Stage.schedule.
    day: { type: Number, min: 1, required: true },
    timeSlot: { type: Number, min: 1, required: true },
    maxTeams: { type: Number, min: 1, default: DEFAULT_GROUP_SIZE },
    teams: [groupTeamSchema],
    secretGroup: { type: secretGroupSchema, default: () => ({}) },
  },
  { timestamps: true },
);

groupSchema.index({ stage: 1, code: 1 }, { unique: true });
groupSchema.index({ stage: 1, day: 1, timeSlot: 1 });

groupSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Group = mongoose.model("Group", groupSchema);

export default Group;
