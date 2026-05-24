import mongoose from "mongoose";

// One row per role. `owner` is seeded by default; other roles are added dynamically.
const roleSchema = new mongoose.Schema(
  {
    value: { type: String, unique: true, required: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Permission" }],
  },
  { timestamps: true },
);

const Role = mongoose.model("Role", roleSchema);

export default Role;
