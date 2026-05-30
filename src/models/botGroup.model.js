import mongoose from "mongoose";

// Bot ko'rgan (admin/a'zo bo'lgan) guruhlar keshi.
// Maqsad: turnir maxfiy guruh havolasi keyin yozilganda chatId'ni inviteHash bo'yicha topish.
const botGroupSchema = new mongoose.Schema(
  {
    chatId: { type: String, trim: true, required: true, unique: true },
    inviteHash: { type: String, trim: true, lowercase: true, default: "", index: true },
    title: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

botGroupSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const BotGroup = mongoose.model("BotGroup", botGroupSchema);

export default BotGroup;
