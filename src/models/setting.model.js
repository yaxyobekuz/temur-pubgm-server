import mongoose from "mongoose";

// Global singleton config (one document). Holds panel-wide settings such as the
// VIP-slot admin contact username shown to leaders in the bot.
const settingSchema = new mongoose.Schema(
  {
    vipAdminUsername: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

settingSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Setting = mongoose.model("Setting", settingSchema);

export default Setting;
