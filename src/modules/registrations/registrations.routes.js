import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import {
  idSchema,
  listSchema,
} from "./validators/registrations.validator.js";
import list from "./handlers/list.handler.js";
import getById from "./handlers/getById.handler.js";
import kick from "./handlers/kick.handler.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.REGISTRATIONS_READ),
  validate(listSchema),
  list,
);
router.get(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.REGISTRATIONS_READ),
  validate(idSchema),
  getById,
);
router.post(
  "/:id/kick",
  requireAuth,
  requirePermission(PERMISSIONS.REGISTRATIONS_UPDATE),
  validate(idSchema),
  kick,
);

export default router;
