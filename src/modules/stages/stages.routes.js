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
  promoteSchema,
} from "./validators/stages.validator.js";
import list from "./handlers/list.handler.js";
import create from "./handlers/create.handler.js";
import update from "./handlers/update.handler.js";
import remove from "./handlers/remove.handler.js";
import promote from "./handlers/promote.handler.js";

const router = Router();

// Tournament-scoped list (use ?tournamentId=...).
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
  requirePermission(PERMISSIONS.STAGES_UPDATE),
  validate(createSchema),
  create,
);
router.patch(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.STAGES_UPDATE),
  validate(updateSchema),
  update,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.STAGES_UPDATE),
  validate(idSchema),
  remove,
);
router.post(
  "/:id/promote",
  requireAuth,
  requirePermission(PERMISSIONS.STAGES_UPDATE),
  validate(promoteSchema),
  promote,
);

export default router;
