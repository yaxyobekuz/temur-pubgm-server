import mongoose from "mongoose";
import { DEFAULT_GROUP_SIZE } from "../constants/tournament.js";

const groupSchema = new mongoose.Schema(
  {
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
      required: true,
      index: true,
    },
    code: { type: String, trim: true, uppercase: true, required: true },
    maxTeams: { type: Number, min: 1, default: DEFAULT_GROUP_SIZE },
    teams: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true },
);

groupSchema.index({ stage: 1, code: 1 }, { unique: true });

groupSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Group = mongoose.model("Group", groupSchema);

export default Group;
