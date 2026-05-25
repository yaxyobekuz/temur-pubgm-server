import { Router } from "express";
import authRouter from "../modules/auth/auth.routes.js";
import usersRouter from "../modules/users/users.routes.js";
import activityLogsRouter from "../modules/activityLogs/activityLogs.routes.js";
import regionsRouter from "../modules/regions/regions.routes.js";
import regionsPublicRouter from "../modules/regions/regions.public.routes.js";
import teamsRouter from "../modules/teams/teams.routes.js";
import tournamentsRouter from "../modules/tournaments/tournaments.routes.js";
import stagesRouter from "../modules/stages/stages.routes.js";
import groupsRouter from "../modules/groups/groups.routes.js";
import registrationsRouter from "../modules/registrations/registrations.routes.js";
import broadcastsRouter from "../modules/broadcasts/broadcasts.routes.js";
import matchesRouter from "../modules/matches/matches.routes.js";
import uploadsRouter from "../modules/uploads/uploads.routes.js";
import botBridgeRouter from "../modules/botBridge/botBridge.routes.js";
import botAuth from "../middleware/botAuth.js";

const router = Router();

router.get("/health", (_req, res) =>
  res.json({ success: true, message: "Server ishlayapti" }),
);

// Public (no auth) - used by the bot for the region picker.
router.use("/public/regions", regionsPublicRouter);

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/activity-logs", activityLogsRouter);
router.use("/regions", regionsRouter);
router.use("/teams", teamsRouter);
router.use("/tournaments", tournamentsRouter);
router.use("/stages", stagesRouter);
router.use("/groups", groupsRouter);
router.use("/tournament-registrations", registrationsRouter);
router.use("/broadcasts", broadcastsRouter);
router.use("/matches", matchesRouter);
router.use("/uploads", uploadsRouter);

// Bot bridge - guarded by X-Bot-Secret.
router.use("/bot", botAuth, botBridgeRouter);

export default router;
