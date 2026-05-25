import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requireRole from "../../middleware/requireRole.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { ROLES } from "../../constants/roles.js";
import { listSchema, idSchema } from "./validators/list.validator.js";
import { adminUpdateSchema } from "./validators/adminUpdate.validator.js";
import {
  meCreateSchema,
  meUpdateSchema,
  meKickSchema,
} from "./validators/me.validator.js";

import list from "./handlers/list.handler.js";
import getById from "./handlers/getById.handler.js";
import adminUpdate from "./handlers/adminUpdate.handler.js";
import adminRemove from "./handlers/adminRemove.handler.js";

import meGet from "./handlers/meGet.handler.js";
import meCreate from "./handlers/meCreate.handler.js";
import meUpdate from "./handlers/meUpdate.handler.js";
import meRegenerateInvite from "./handlers/meRegenerateInvite.handler.js";
import meKickMember from "./handlers/meKickMember.handler.js";
import meLeave from "./handlers/meLeave.handler.js";

const router = Router();

// Self scope first so `/me/...` doesn't collide with `/:id`.
router.get("/me", requireAuth, meGet);
router.post(
  "/me",
  requireAuth,
  requireRole(ROLES.LEADER),
  validate(meCreateSchema),
  meCreate,
);
router.patch(
  "/me",
  requireAuth,
  requireRole(ROLES.LEADER),
  validate(meUpdateSchema),
  meUpdate,
);
router.post(
  "/me/regenerate-invite",
  requireAuth,
  requireRole(ROLES.LEADER),
  meRegenerateInvite,
);
router.delete(
  "/me/members/:userId",
  requireAuth,
  requireRole(ROLES.LEADER),
  validate(meKickSchema),
  meKickMember,
);
router.post(
  "/me/leave",
  requireAuth,
  requireRole(ROLES.PLAYER),
  meLeave,
);

// Admin scope.
router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.TEAMS_READ),
  validate(listSchema),
  list,
);
router.get(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.TEAMS_READ),
  validate(idSchema),
  getById,
);
router.patch(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.TEAMS_UPDATE),
  validate(adminUpdateSchema),
  adminUpdate,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.TEAMS_DELETE),
  validate(idSchema),
  adminRemove,
);

export default router;
