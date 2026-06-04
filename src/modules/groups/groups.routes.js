import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import {
  listSchema,
  removeTeamSchema,
  addTeamSchema,
  setSecretGroupSchema,
  idParamSchema,
} from "./validators/groups.validator.js";
import list from "./handlers/list.handler.js";
import removeTeam from "./handlers/removeTeam.handler.js";
import addTeam from "./handlers/addTeam.handler.js";
import { setSecretGroup, clearSecretGroup } from "./handlers/secretGroup.handler.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_READ),
  validate(listSchema),
  list,
);
router.post(
  "/:id/teams",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(addTeamSchema),
  addTeam,
);
router.delete(
  "/:id/teams/:teamId",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(removeTeamSchema),
  removeTeam,
);
router.put(
  "/:id/secret-group",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(setSecretGroupSchema),
  setSecretGroup,
);
router.delete(
  "/:id/secret-group",
  requireAuth,
  requirePermission(PERMISSIONS.GROUPS_UPDATE),
  validate(idParamSchema),
  clearSecretGroup,
);

export default router;
