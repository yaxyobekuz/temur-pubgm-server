import { z } from "zod";

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    url: z.string().min(3).max(500),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(1).max(120).optional(),
      url: z.string().min(3).max(500).optional(),
      order: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});
