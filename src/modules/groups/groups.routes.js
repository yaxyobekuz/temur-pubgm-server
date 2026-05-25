import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import {
  listSchema,
  removeTeamSchema,
} from "./validators/groups.validator.js";
import list from "./handlers/list.handler.js";
import removeTeam from "./handlers/removeTeam.handler.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_READ),
  validate(listSchema),
  list,
);
router.delete(
  "/:id/teams/:teamId",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(removeTeamSchema),
  removeTeam,
);

export default router;
