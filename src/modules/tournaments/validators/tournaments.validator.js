import { z } from "zod";
import {
  TOURNAMENT_STATUS,
  TOURNAMENT_MODE,
} from "../../../constants/tournament.js";

export const listSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.enum(Object.values(TOURNAMENT_STATUS)).optional(),
    mode: z.enum(Object.values(TOURNAMENT_MODE)).optional(),
    regionId: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  }),
});

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120),
    banner: z.string().max(500).optional(),
    description: z.string().max(2000).optional(),
    prizePool: z.string().max(120).optional(),
    mode: z.enum(Object.values(TOURNAMENT_MODE)),
    regionId: z.string().min(1).optional(),
    startDate: z.union([z.coerce.date(), z.string().min(1)]).optional(),
    maps: z.array(z.string().min(1).max(60)).optional(),
    maxTeams: z.number().int().min(1).max(1000).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      title: z.string().min(2).max(120).optional(),
      banner: z.string().max(500).optional(),
      description: z.string().max(2000).optional(),
      prizePool: z.string().max(120).optional(),
      mode: z.enum(Object.values(TOURNAMENT_MODE)).optional(),
      regionId: z.string().min(1).nullable().optional(),
      startDate: z.union([z.coerce.date(), z.null()]).optional(),
      maps: z.array(z.string().min(1).max(60)).optional(),
      maxTeams: z.number().int().min(1).max(1000).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});

export const changeStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    next: z.enum(Object.values(TOURNAMENT_STATUS)),
  }),
});

export const addSponsorSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    type: z.enum(["telegram", "social"]),
    title: z.string().min(1).max(120),
    url: z.string().min(3).max(500),
    chatId: z.string().max(60).optional(),
    chatUsername: z.string().max(120).optional(),
  }),
});

export const removeSponsorSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    channelId: z.string().min(1),
  }),
});
