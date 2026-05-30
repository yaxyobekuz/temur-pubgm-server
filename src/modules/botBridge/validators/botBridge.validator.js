import { z } from "zod";
import { SELF_SWITCHABLE_ROLES } from "../../../constants/roles.js";
import { ROSTER_SLOT } from "../../../models/tournamentRegistration.model.js";

const tgIdSchema = z.coerce.number().int().positive();

export const registerOrLoginSchema = z.object({
  body: z.object({
    tgId: tgIdSchema,
    tgUsername: z.string().optional(),
    firstName: z.string().min(1).max(60),
    lastName: z.string().max(60).optional(),
    contactPhone: z.string().min(7).max(20),
    regionId: z.string().min(1),
  }),
});

export const getMeSchema = z.object({
  query: z.object({ tgId: tgIdSchema }),
});

export const switchRoleSchema = z.object({
  body: z.object({
    tgId: tgIdSchema,
    newRole: z.enum([...SELF_SWITCHABLE_ROLES]),
  }),
});

export const switchRegionSchema = z.object({
  body: z.object({
    tgId: tgIdSchema,
    regionId: z.string().min(1),
  }),
});

export const updateContactUsernameSchema = z.object({
  body: z.object({
    tgId: tgIdSchema,
    contactUsername: z.string().min(1).max(100),
  }),
});

export const getTeamSchema = z.object({
  query: z.object({ tgId: tgIdSchema }),
});

export const createTeamSchema = z.object({
  body: z.object({
    tgId: tgIdSchema,
    name: z.string().min(2).max(60),
    logo: z.string().max(500).optional(),
  }),
});

export const updateTeamSchema = z.object({
  body: z
    .object({
      tgId: tgIdSchema,
      name: z.string().min(2).max(60).optional(),
      logo: z.string().max(500).optional(),
      // Remote Telegram file URL - server downloads and stores it.
      logoUrl: z.string().url().max(1000).optional(),
      // Telegram file_id cache for instant resends.
      logoFileId: z.string().max(200).optional(),
    })
    .refine(
      (b) => b.name !== undefined || b.logo !== undefined || b.logoUrl !== undefined,
      { message: "Hech bo'lmaganda bitta maydon kerak" },
    ),
});

export const tgOnlySchema = z.object({
  body: z.object({ tgId: tgIdSchema }),
});

export const kickMemberSchema = z.object({
  body: z.object({
    tgId: tgIdSchema,
    memberId: z.string().min(1),
  }),
});

export const acceptInviteSchema = z.object({
  body: z.object({
    tgId: tgIdSchema,
    inviteCode: z.string().min(3),
  }),
});

// --- Tournament bridge schemas --------------------------------------------

export const tournamentIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const registerTournamentSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    tgId: tgIdSchema,
    roster: z
      .array(
        z.object({
          user: z.string().min(1),
          slot: z.enum(Object.values(ROSTER_SLOT)),
          position: z.number().int().min(0).optional(),
        }),
      )
      .min(1)
      .max(20),
  }),
});

export const myRegistrationsSchema = z.object({
  query: z.object({ tgId: tgIdSchema }),
});
