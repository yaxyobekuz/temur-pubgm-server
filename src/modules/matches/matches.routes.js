import { Router } from "express";
import requireAuth from "../../middleware/auth.js";
import requirePermission from "../../middleware/requirePermission.js";
import validate from "../../middleware/validate.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import {
  idSchema,
  stageIdSchema,
  listSchema,
  createSchema,
  updateSchema,
  setResultsSchema,
} from "./validators/matches.validator.js";
import list from "./handlers/list.handler.js";
import getById from "./handlers/getById.handler.js";
import create from "./handlers/create.handler.js";
import update from "./handlers/update.handler.js";
import remove from "./handlers/remove.handler.js";
import setResults from "./handlers/setResults.handler.js";
import broadcastRoom from "./handlers/broadcastRoom.handler.js";
import standings from "./handlers/standings.handler.js";

const router = Router();

router.get(
  "/standings/:stageId",
  requireAuth,
  requirePermission(PERMISSIONS.MATCHES_READ),
  validate(stageIdSchema),
  standings,
);
router.get(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.MATCHES_READ),
  validate(listSchema),
  list,
);
router.get(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.MATCHES_READ),
  validate(idSchema),
  getById,
);
router.post(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.MATCHES_CREATE),
  validate(createSchema),
  create,
);
router.patch(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.MATCHES_UPDATE),
  validate(updateSchema),
  update,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission(PERMISSIONS.MATCHES_DELETE),
  validate(idSchema),
  remove,
);
router.post(
  "/:id/results",
  requireAuth,
  requirePermission(PERMISSIONS.MATCHES_UPDATE),
  validate(setResultsSchema),
  setResults,
);
router.post(
  "/:id/broadcast-room",
  requireAuth,
  requirePermission(PERMISSIONS.MATCHES_UPDATE),
  validate(idSchema),
  broadcastRoom,
);

export default router;
