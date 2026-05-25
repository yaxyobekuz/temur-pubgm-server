import { z } from "zod";

export const listSchema = z.object({
  query: z.object({ stageId: z.string().min(1) }),
});

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createSchema = z.object({
  body: z.object({
    stageId: z.string().min(1),
    code: z.string().min(1).max(8),
    maxTeams: z.number().int().min(1).max(100).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      code: z.string().min(1).max(8).optional(),
      maxTeams: z.number().int().min(1).max(100).optional(),
      teams: z.array(z.string().min(1)).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});

export const removeTeamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
  }),
});
