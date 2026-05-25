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

  // Owner - super-admin, always has every permission.
  await Role.findOneAndUpdate(
    { value: ROLES.OWNER },
    {
      $setOnInsert: { value: ROLES.OWNER, label: "Ega" },
      $set: { permissions: Object.values(permIds) },
    },
    { upsert: true, new: true },
  );
  logger.info("Owner roli seed qilindi");

  // Admin - tournament organizer; gets read + team/region oversight by default.
  // (Tournament-specific permissions appear in Phase 2 and will be granted there.)
  await Role.findOneAndUpdate(
    { value: ROLES.ADMIN },
    {
      $setOnInsert: { value: ROLES.ADMIN, label: "Administrator" },
      $set: {
        permissions: [
          permIds[PERMISSIONS.USERS_READ],
          permIds[PERMISSIONS.ACTIVITY_LOGS_READ],
          permIds[PERMISSIONS.REGIONS_READ],
          permIds[PERMISSIONS.REGIONS_CREATE],
          permIds[PERMISSIONS.REGIONS_UPDATE],
          permIds[PERMISSIONS.REGIONS_DELETE],
          permIds[PERMISSIONS.TEAMS_READ],
          permIds[PERMISSIONS.TEAMS_UPDATE],
          permIds[PERMISSIONS.TEAMS_DELETE],
          permIds[PERMISSIONS.TOURNAMENTS_READ],
          permIds[PERMISSIONS.TOURNAMENTS_CREATE],
          permIds[PERMISSIONS.TOURNAMENTS_UPDATE],
          permIds[PERMISSIONS.TOURNAMENTS_DELETE],
          permIds[PERMISSIONS.GROUPS_UPDATE],
          permIds[PERMISSIONS.REGISTRATIONS_READ],
          permIds[PERMISSIONS.REGISTRATIONS_UPDATE],
          permIds[PERMISSIONS.BROADCASTS_READ],
          permIds[PERMISSIONS.BROADCASTS_CREATE],
          permIds[PERMISSIONS.BROADCASTS_UPDATE],
          permIds[PERMISSIONS.BROADCASTS_DELETE],
        ].filter(Boolean),
      },
    },
    { upsert: true, new: true },
  );
  logger.info("Admin roli seed qilindi");

  // Leader - team captain. Self-scoped + tournament registration.
  await Role.findOneAndUpdate(
    { value: ROLES.LEADER },
    {
      $setOnInsert: { value: ROLES.LEADER, label: "Komanda sardori" },
      $set: {
        permissions: [
          permIds[PERMISSIONS.TOURNAMENTS_READ],
          permIds[PERMISSIONS.TOURNAMENTS_REGISTER],
        ].filter(Boolean),
      },
    },
    { upsert: true, new: true },
  );
  logger.info("Leader roli seed qilindi");

  // Player - participant. No panel permissions; bot is the main interface.
  await Role.findOneAndUpdate(
    { value: ROLES.PLAYER },
    {
      $setOnInsert: { value: ROLES.PLAYER, label: "O'yinchi" },
      $set: { permissions: [] },
    },
    { upsert: true, new: true },
  );
  logger.info("Player roli seed qilindi");

  await disconnectDB();
};

seed().catch((err) => {
  logger.error({ err }, "Seed xato");
  process.exit(1);
});
