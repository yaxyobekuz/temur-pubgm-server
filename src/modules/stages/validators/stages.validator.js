import { z } from "zod";
import { STAGE_STATUS, ALL_STAGE_ORDERS } from "../../../constants/tournament.js";

export const listSchema = z.object({
  query: z.object({ tournamentId: z.string().min(1) }),
});

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

const stageOrderSchema = z.union([z.literal(1), z.literal(2), z.literal("final")]);

export const createSchema = z.object({
  body: z.object({
    tournamentId: z.string().min(1),
    order: stageOrderSchema.refine((v) => ALL_STAGE_ORDERS.includes(v), {
      message: "Bosqich tartibi noto'g'ri",
    }),
    startAt: z.union([z.coerce.date(), z.string()]).optional(),
    endAt: z.union([z.coerce.date(), z.string()]).optional(),
    maxGroups: z.number().int().min(1).max(20).optional(),
    maxTeamsPerGroup: z.number().int().min(1).max(100).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      status: z.enum(Object.values(STAGE_STATUS)).optional(),
      startAt: z.union([z.coerce.date(), z.null()]).optional(),
      endAt: z.union([z.coerce.date(), z.null()]).optional(),
      maxGroups: z.number().int().min(1).max(20).optional(),
      maxTeamsPerGroup: z.number().int().min(1).max(100).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});

export const promoteSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    groupId: z.string().min(1),
    teamIds: z.array(z.string().min(1)).min(1),
  }),
});
