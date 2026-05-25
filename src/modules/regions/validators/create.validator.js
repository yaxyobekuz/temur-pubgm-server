import { z } from "zod";

export const createSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(60),
    nameRu: z.string().max(60).optional(),
    code: z
      .string()
      .min(2)
      .max(40)
      .regex(/^[a-z0-9_-]+$/i, "Faqat lotin harflari, raqam, _ va - belgilar"),
    timezone: z.string().min(3).max(60).optional(),
    isActive: z.boolean().optional(),
  }),
});
