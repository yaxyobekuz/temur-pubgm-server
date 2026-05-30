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
  changeStatusSchema,
  addSponsorSchema,
  removeSponsorSchema,
  setSecretGroupSchema,
  idParamSchema,
  promoteSchema,
} from "./validators/tournaments.validator.js";
import list from "./handlers/list.handler.js";
import getById from "./handlers/getById.handler.js";
import create from "./handlers/create.handler.js";
import update from "./handlers/update.handler.js";
import remove from "./handlers/remove.handler.js";
import changeStatus from "./handlers/changeStatus.handler.js";
import promote from "./handlers/promote.handler.js";
import {
  addSponsorChannel,
  removeSponsorChannel,
} from "./handlers/sponsor.handler.js";
import {
  setSecretGroup,
  clearSecretGroup,
} from "./handlers/secretGroup.handler.js";
import register from "../registrations/handlers/register.handler.js";
import { registerSchema } from "../registrations/validators/registrations.validator.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_READ),
  validate(listSchema),
  list,
);
router.get(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_READ),
  validate(idSchema),
  getById,
);
router.post(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_CREATE),
  validate(createSchema),
  create,
);
router.patch(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_UPDATE),
  validate(updateSchema),
  update,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_DELETE),
  validate(idSchema),
  remove,
);
router.post(
  "/:id/status",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_UPDATE),
  validate(changeStatusSchema),
  changeStatus,
);
router.post(
  "/:id/promote-to-next",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_UPDATE),
  validate(promoteSchema),
  promote,
);
router.post(
  "/:id/sponsor-channels",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_UPDATE),
  validate(addSponsorSchema),
  addSponsorChannel,
);
router.delete(
  "/:id/sponsor-channels/:channelId",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_UPDATE),
  validate(removeSponsorSchema),
  removeSponsorChannel,
);
router.put(
  "/:id/secret-group",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_UPDATE),
  validate(setSecretGroupSchema),
  setSecretGroup,
);
router.delete(
  "/:id/secret-group",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_UPDATE),
  validate(idParamSchema),
  clearSecretGroup,
);

// Leader-scoped registration endpoint.
router.post(
  "/:id/register",
  requireAuth,
  requirePermission(PERMISSIONS.TOURNAMENTS_REGISTER),
  validate(registerSchema),
  register,
);

export default router;
