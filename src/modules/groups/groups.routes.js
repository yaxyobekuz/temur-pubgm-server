import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import {
  listSchema,
  idSchema,
  createSchema,
  updateSchema,
  removeTeamSchema,
} from "./validators/groups.validator.js";
import list from "./handlers/list.handler.js";
import create from "./handlers/create.handler.js";
import update from "./handlers/update.handler.js";
import remove from "./handlers/remove.handler.js";
import removeTeam from "./handlers/removeTeam.handler.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_READ),
  validate(listSchema),
  list,
);
router.post(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(createSchema),
  create,
);
router.patch(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(updateSchema),
  update,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(idSchema),
  remove,
);
router.delete(
  "/:id/teams/:teamId",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(removeTeamSchema),
  removeTeam,
);

export default router;
