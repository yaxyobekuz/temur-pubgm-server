import { z } from "zod";

// "20:00" yoki bo'sh.
const timeStr = z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, "Vaqt HH:MM formatida bo'lsin");

export const scheduleSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    schedule: z
      .array(
        z.object({
          day: z.number().int().min(1),
          date: z.union([z.coerce.date(), z.null()]).optional(),
          timeSlots: z
            .array(
              z.object({
                timeSlot: z.number().int().min(1),
                time: timeStr.optional(),
              }),
            )
            .default([]),
        }),
      )
      .default([]),
  }),
});
