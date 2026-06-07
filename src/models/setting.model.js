import mongoose from "mongoose";
import { DEFAULT_MAPS } from "../constants/tournament.js";

// Global singleton config (one document). Holds panel-wide settings such as the
// VIP-slot admin contact username shown to leaders in the bot, and the editable
// pool of game maps that tournaments pick from.
const settingSchema = new mongoose.Schema(
  {
    vipAdminUsername: { type: String, trim: true, default: "" },
    // Available game maps; the owner edits this on the Settings page. Seeded with the
    // default PUBG Mobile pool (also backfilled onto existing docs that lack the field).
    maps: { type: [{ type: String, trim: true }], default: () => [...DEFAULT_MAPS] },
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
