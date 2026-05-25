import { z } from "zod";

export const meCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(60),
    logo: z.string().max(500).optional(),
  }),
});

export const meUpdateSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(60).optional(),
      logo: z.string().max(500).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});

export const meKickSchema = z.object({
  params: z.object({ userId: z.string().min(1) }),
});
