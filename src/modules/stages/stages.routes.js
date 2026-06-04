import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { scheduleSchema } from "./validators/stages.validator.js";
import setSchedule from "./handlers/setSchedule.handler.js";

const router = Router();

router.put(
  "/:id/schedule",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_UPDATE),
  validate(scheduleSchema),
  setSchedule,
);

export default router;
