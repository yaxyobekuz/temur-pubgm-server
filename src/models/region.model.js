import mongoose from "mongoose";

// Soddalashtirilgan mintaqa: faqat nom va GMT soat farqi.
// Misol: { name: "O'zbekiston", gmtOffset: 5 }, { name: "Rossiya", gmtOffset: 3 }
const regionSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, unique: true },
    gmtOffset: { type: Number, required: true, min: -12, max: 14 },
  },
  { timestamps: true },
);

regionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Region = mongoose.model("Region", regionSchema);

export default Region;
