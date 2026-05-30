import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";

// `role` is a string. `owner` is the only hard-coded value;
// other role values come from the `Role` collection (dynamic).
const PANEL_ROLES = new Set([ROLES.OWNER, ROLES.ADMIN]);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, default: "" },
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      lowercase: true,
      required: function () {
        return PANEL_ROLES.has(this.role);
      },
    },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: {
      type: String,
      select: false,
      required: function () {
        return PANEL_ROLES.has(this.role);
      },
    },
    role: { type: String, required: true },
    isActive: { type: Boolean, default: true },

    birthDate: { type: Date, default: null },
    gender: { type: String, enum: ["male", "female"], default: null },
    address: { type: String, trim: true, default: "" },

    tgId: { type: Number, unique: true, sparse: true, index: true },
    tgUsername: { type: String, trim: true, lowercase: true, default: "" },
    gameNickname: { type: String, trim: true, default: "" },
    region: { type: mongoose.Schema.Types.ObjectId, ref: "Region", default: null },
    contactPhone: { type: String, trim: true, default: "" },
    // Manually entered contact handle (independent of the auto-captured tgUsername).
    contactUsername: { type: String, trim: true, lowercase: true, default: "" },
  },
  { timestamps: true },
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

export default User;
