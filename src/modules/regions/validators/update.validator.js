import { z } from "zod";

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(2).max(60).optional(),
      nameRu: z.string().max(60).optional(),
      code: z
        .string()
        .min(2)
        .max(40)
        .regex(/^[a-z0-9_-]+$/i)
        .optional(),
      timezone: z.string().min(3).max(60).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
