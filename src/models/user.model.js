import mongoose from "mongoose";

// `role` is a string. `owner` is the only hard-coded value;
// other role values come from the `Role` collection (dynamic).
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true, required: true },
    username: { type: String, trim: true, unique: true, required: true, lowercase: true },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true },
    isActive: { type: Boolean, default: true },

    birthDate: { type: Date, default: null },
    gender: { type: String, enum: ["male", "female"], default: null },
    address: { type: String, trim: true, default: "" },
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
