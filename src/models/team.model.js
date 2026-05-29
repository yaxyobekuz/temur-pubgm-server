import mongoose from "mongoose";

export const TEAM_MEMBERS_MAX = 100;

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    logo: { type: String, trim: true, default: "" },
    // Telegram file_id cache - lets the bot resend the logo instantly (no re-upload).
    logoFileId: { type: String, trim: true, default: "" },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      sparse: true,
    },
    members: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    inviteCode: { type: String, trim: true, unique: true, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

teamSchema.index({ members: 1 });

teamSchema.path("members").validate(function (members) {
  return Array.isArray(members) && members.length <= TEAM_MEMBERS_MAX;
}, `Jamoa a'zolari ${TEAM_MEMBERS_MAX} tadan ortiq bo'lishi mumkin emas`);

teamSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Team = mongoose.model("Team", teamSchema);

export default Team;
