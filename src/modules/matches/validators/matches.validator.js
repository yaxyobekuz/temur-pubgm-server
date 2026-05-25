import { z } from "zod";
import { MATCH_STATUS } from "../../../models/match.model.js";

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const stageIdSchema = z.object({
  params: z.object({ stageId: z.string().min(1) }),
});

export const listSchema = z.object({
  query: z
    .object({
      tournament: z.string().optional(),
      stage: z.string().optional(),
      group: z.string().optional(),
    })
    .refine((q) => q.tournament || q.stage || q.group, {
      message: "tournament/stage/group filtri kerak",
    }),
});

export const createSchema = z.object({
  body: z.object({
    groupId: z.string().min(1),
    order: z.number().int().min(1).max(50).optional(),
    map: z.string().max(60).optional(),
    startAt: z.union([z.coerce.date(), z.string()]).optional(),
    roomId: z.string().max(60).optional(),
    roomPassword: z.string().max(60).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      map: z.string().max(60).optional(),
      startAt: z.union([z.coerce.date(), z.null()]).optional(),
      roomId: z.string().max(60).optional(),
      roomPassword: z.string().max(60).optional(),
      status: z.enum(Object.values(MATCH_STATUS)).optional(),
      order: z.number().int().min(1).max(50).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});

export const setResultsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    results: z
      .array(
        z.object({
          registration: z.string().min(1),
          place: z.number().int().min(1).max(100).nullable().optional(),
          kills: z.number().int().min(0).max(100).optional(),
        }),
      )
      .min(1),
  }),
});
