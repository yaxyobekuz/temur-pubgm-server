import mongoose from "mongoose";

// Help links shown in the bot's "Yordam" message as inline buttons.
// Example: { name: "Admin 1", url: "https://t.me/admin_1" }
const helpLinkSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    url: { type: String, trim: true, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

helpLinkSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const HelpLink = mongoose.model("HelpLink", helpLinkSchema);

export default HelpLink;
