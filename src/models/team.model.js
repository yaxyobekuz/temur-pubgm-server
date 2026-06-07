import mongoose from "mongoose";

export const TEAM_MEMBERS_MAX = 100;
// Short clan tag shown before the team name in listings (e.g. "ZRx", "NXL").
export const TEAM_TAG_MAX = 10;

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    // Optional short clan tag (prefix shown in team lists). Empty when unset.
    tag: { type: String, trim: true, default: "", maxlength: TEAM_TAG_MAX },
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
