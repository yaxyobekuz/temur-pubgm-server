import { z } from "zod";
import {
  BROADCAST_STATUS,
  BROADCAST_TARGET,
} from "../../../models/broadcastJob.model.js";

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    status: z.enum(Object.values(BROADCAST_STATUS)).optional(),
  }),
});

const targetSchema = z.object({
  type: z.enum(Object.values(BROADCAST_TARGET)),
  ids: z.array(z.string()).optional(),
});

export const createSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    body: z.string().max(4096).optional(),
    mediaUrl: z.string().max(500).optional(),
    buttons: z
      .array(
        z.object({
          text: z.string().min(1).max(60),
          url: z.string().min(3).max(500),
        }),
      )
      .max(6)
      .optional(),
    target: targetSchema,
    scheduledAt: z.union([z.coerce.date(), z.string()]).optional(),
  }),
});

export const previewSchema = z.object({
  body: targetSchema,
});
