import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { updateSchema } from "./validators/settings.validator.js";
import get from "./handlers/get.handler.js";
import update from "./handlers/update.handler.js";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.SETTINGS_READ), get);
router.patch(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  validate(updateSchema),
  update,
);

export default router;
