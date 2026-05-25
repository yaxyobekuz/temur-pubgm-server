import { z } from "zod";

export const createSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(60),
    gmtOffset: z.coerce.number().int().min(-12).max(14),
  }),
});
