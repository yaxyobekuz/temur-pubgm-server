import mongoose from "mongoose";

// Minimal "stage marker" — tournament + order raqami. UI'da oxirgi order = "Final".
const stageSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      index: true,
    },
    order: { type: Number, min: 1, required: true },
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
