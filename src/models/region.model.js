import mongoose from "mongoose";

const regionSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    nameRu: { type: String, trim: true, default: "" },
    code: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
    },
    timezone: { type: String, trim: true, default: "Asia/Tashkent" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

regionSchema.index({ isActive: 1 });

regionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Region = mongoose.model("Region", regionSchema);

export default Region;
