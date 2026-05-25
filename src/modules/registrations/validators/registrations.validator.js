import { z } from "zod";
import { ROSTER_SLOT, REGISTRATION_STATUS } from "../../../models/tournamentRegistration.model.js";

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const listSchema = z.object({
  query: z
    .object({
      tournament: z.string().optional(),
      team: z.string().optional(),
      status: z.enum(Object.values(REGISTRATION_STATUS)).optional(),
    })
    .refine((q) => q.tournament || q.team, {
      message: "tournament yoki team kerak",
    }),
});

export const registerSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
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
