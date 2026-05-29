import { z } from "zod";

export const updateMeSchema = z.object({
  body: z
    .object({
      firstName: z.string().min(1).max(60).optional(),
      lastName: z.string().max(60).optional(),
      username: z.string().min(3).max(30).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});
