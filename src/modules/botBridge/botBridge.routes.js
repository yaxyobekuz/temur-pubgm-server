import { Router } from "express";
import validate from "../../middleware/validate.js";
import {
  registerOrLoginSchema,
  getMeSchema,
  switchRoleSchema,
  switchRegionSchema,
  updateContactUsernameSchema,
  getTeamSchema,
  createTeamSchema,
  updateTeamSchema,
  tgOnlySchema,
  kickMemberSchema,
  acceptInviteSchema,
  tournamentIdSchema,
  setBannerFileIdSchema,
  registerTournamentSchema,
  myRegistrationsSchema,
  openSlotsSchema,
  sponsorCheckSchema,
  pendingPlacementSchema,
  placeSchema,
} from "./validators/botBridge.validator.js";
import registerOrLogin from "./handlers/registerOrLogin.handler.js";
import getMe from "./handlers/getMe.handler.js";
import switchRole from "./handlers/switchRole.handler.js";
import switchRegion from "./handlers/switchRegion.handler.js";
import updateContactUsername from "./handlers/updateContactUsername.handler.js";
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
  setBannerFileId,
  register as registerTournament,
  myRegistrations,
  openSlots,
  sponsorCheck,
  selfSponsor,
  resendSponsorReminders,
  pendingPlacement,
  placeIntoStage,
} from "./handlers/tournaments.handler.js";
import { listHelpLinks } from "./handlers/helpLinks.handler.js";
import { getSettings } from "./handlers/settings.handler.js";

// All routes here are mounted under `/api/bot/*` and protected by the botAuth middleware.
const router = Router();

router.post("/auth/register-or-login", validate(registerOrLoginSchema), registerOrLogin);
router.get("/users/me", validate(getMeSchema), getMe);
router.post("/users/role", validate(switchRoleSchema), switchRole);
router.post("/users/region", validate(switchRegionSchema), switchRegion);
router.patch(
  "/users/contact-username",
  validate(updateContactUsernameSchema),
  updateContactUsername,
);
router.post(
  "/users/sponsor-reminders/resend",
  validate(tgOnlySchema),
  resendSponsorReminders,
);

router.get("/teams", validate(getTeamSchema), getTeam);
router.post("/teams", validate(createTeamSchema), createTeam);
router.patch("/teams", validate(updateTeamSchema), updateTeam);
router.post("/teams/regenerate-invite", validate(tgOnlySchema), regenerateInvite);
router.post("/teams/kick", validate(kickMemberSchema), kickMember);
router.post("/teams/leave", validate(tgOnlySchema), leaveTeam);
router.post("/teams/accept-invite", validate(acceptInviteSchema), acceptInvite);

router.get("/tournaments", listTournaments);
router.get("/tournaments/:id/open-slots", validate(openSlotsSchema), openSlots);
router.get("/tournaments/:id/sponsor-check", validate(sponsorCheckSchema), sponsorCheck);
router.get("/tournaments/:id/sponsor-self", validate(sponsorCheckSchema), selfSponsor);
router.get("/tournaments/:id", validate(tournamentIdSchema), getTournament);
router.patch(
  "/tournaments/:id/banner-file-id",
  validate(setBannerFileIdSchema),
  setBannerFileId,
);
router.post(
  "/tournaments/:id/register",
  validate(registerTournamentSchema),
  registerTournament,
);
router.get("/registrations/pending-placement", validate(pendingPlacementSchema), pendingPlacement);
router.get("/registrations", validate(myRegistrationsSchema), myRegistrations);
router.post("/registrations/:id/place", validate(placeSchema), placeIntoStage);

router.get("/help-links", listHelpLinks);
router.get("/settings", getSettings);

export default router;
