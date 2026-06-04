import mongoose from "mongoose";

// Materialized per-stage structure (from STAGE_BLUEPRINTS at create time).
const stageConfigSchema = new mongoose.Schema(
  {
    daysCount: { type: Number, min: 1, required: true },
    timeSlotsPerDay: { type: Number, min: 1, required: true },
    groupsPerTimeSlot: { type: Number, min: 1, required: true },
    maxTeamsPerGroup: { type: Number, min: 1, required: true },
    advancePlaces: { type: Number, min: 1, required: true },
  },
  { _id: false },
);

// Admin-entered concrete schedule: per day a real date, per time slot a "HH:MM" label.
// Single source of truth for the date/time labels shown in the bot and admin UI.
const scheduleTimeSlotSchema = new mongoose.Schema(
  {
    timeSlot: { type: Number, min: 1, required: true },
    time: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const scheduleDaySchema = new mongoose.Schema(
  {
    day: { type: Number, min: 1, required: true },
    date: { type: Date, default: null },
    timeSlots: [scheduleTimeSlotSchema],
  },
  { _id: false },
);

// "Stage marker" - tournament + order raqami + tuzilma config. UI'da oxirgi order = "Final".
const stageSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    order: { type: Number, min: 1, required: true },
    config: { type: stageConfigSchema, required: true },
    schedule: { type: [scheduleDaySchema], default: [] },
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
