import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import Permission from "../models/permission.model.js";
import Role from "../models/role.model.js";
import { PERMISSIONS, PERMISSION_LABELS } from "../constants/permissions.js";
import { ROLES } from "../constants/roles.js";
import logger from "../config/logger.js";

const seed = async () => {
  await connectDB();

  const permIds = {};
  for (const key of Object.values(PERMISSIONS)) {
    const meta = PERMISSION_LABELS[key] || { label: key, group: "general" };
    const doc = await Permission.findOneAndUpdate(
      { key },
      { $set: { label: meta.label, group: meta.group } },
      { upsert: true, new: true },
    );
    permIds[key] = doc._id;
  }
  logger.info(`Permissions seed qilindi: ${Object.keys(permIds).length}`);

  // Owner — super-admin, always has every permission.
  await Role.findOneAndUpdate(
    { value: ROLES.OWNER },
    {
      $setOnInsert: { value: ROLES.OWNER, label: "Ega" },
      $set: { permissions: Object.values(permIds) },
    },
    { upsert: true, new: true },
  );
  logger.info("Owner roli seed qilindi");

  await disconnectDB();
};

seed().catch((err) => {
  logger.error({ err }, "Seed xato");
  process.exit(1);
});
