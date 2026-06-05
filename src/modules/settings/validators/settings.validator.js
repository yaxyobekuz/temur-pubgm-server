import { z } from "zod";

export const updateSchema = z.object({
  body: z
    .object({
      vipAdminUsername: z.string().max(64).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});
