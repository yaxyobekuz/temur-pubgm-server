import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import {
  idSchema,
  listSchema,
  createSchema,
  previewSchema,
} from "./validators/broadcasts.validator.js";
import list from "./handlers/list.handler.js";
import getById from "./handlers/getById.handler.js";
import create from "./handlers/create.handler.js";
import cancel from "./handlers/cancel.handler.js";
import remove from "./handlers/remove.handler.js";
import audiencePreview from "./handlers/audiencePreview.handler.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.BROADCASTS_READ),
  validate(listSchema),
  list,
);
router.get(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.BROADCASTS_READ),
  validate(idSchema),
  getById,
);
router.post(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.BROADCASTS_CREATE),
  validate(createSchema),
  create,
);
router.post(
  "/audience-preview",
  requireAuth,
  requirePermission(PERMISSIONS.BROADCASTS_CREATE),
  validate(previewSchema),
  audiencePreview,
);
router.post(
  "/:id/cancel",
  requireAuth,
  requirePermission(PERMISSIONS.BROADCASTS_UPDATE),
  validate(idSchema),
  cancel,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.BROADCASTS_DELETE),
  validate(idSchema),
  remove,
);

export default router;
