import { z } from "zod";

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      name: z.string().min(2).max(60).optional(),
      gmtOffset: z.coerce.number().int().min(-12).max(14).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});
