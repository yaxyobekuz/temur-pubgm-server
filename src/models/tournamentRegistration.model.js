import mongoose from "mongoose";

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
