import { Router } from "express";
import validate from "../../middleware/validate.js";
import {
  registerOrLoginSchema,
  getMeSchema,
  switchRoleSchema,
  getTeamSchema,
  createTeamSchema,
  updateTeamSchema,
  tgOnlySchema,
  kickMemberSchema,
  acceptInviteSchema,
  tournamentIdSchema,
  registerTournamentSchema,
  myRegistrationsSchema,
} from "./validators/botBridge.validator.js";
import registerOrLogin from "./handlers/registerOrLogin.handler.js";
import getMe from "./handlers/getMe.handler.js";
import switchRole from "./handlers/switchRole.handler.js";
import {
  getTeam,
  createTeam,
  updateTeam,
  regenerateInvite,
  kickMember,
  leaveTeam,
  acceptInvite,
} from "./handlers/team.handler.js";
import {
  listTournaments,
  getTournament,
  register as registerTournament,
  myRegistrations,
} from "./handlers/tournaments.handler.js";

// All routes here are mounted under `/api/bot/*` and protected by the botAuth middleware.
const router = Router();

router.post("/auth/register-or-login", validate(registerOrLoginSchema), registerOrLogin);
router.get("/users/me", validate(getMeSchema), getMe);
router.post("/users/role", validate(switchRoleSchema), switchRole);

router.get("/teams", validate(getTeamSchema), getTeam);
router.post("/teams", validate(createTeamSchema), createTeam);
router.patch("/teams", validate(updateTeamSchema), updateTeam);
router.post("/teams/regenerate-invite", validate(tgOnlySchema), regenerateInvite);
router.post("/teams/kick", validate(kickMemberSchema), kickMember);
router.post("/teams/leave", validate(tgOnlySchema), leaveTeam);
router.post("/teams/accept-invite", validate(acceptInviteSchema), acceptInvite);

router.get("/tournaments", listTournaments);
router.get("/tournaments/:id", validate(tournamentIdSchema), getTournament);
router.post(
  "/tournaments/:id/register",
  validate(registerTournamentSchema),
  registerTournament,
);
router.get("/registrations", validate(myRegistrationsSchema), myRegistrations);

export default router;
