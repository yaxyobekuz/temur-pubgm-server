import { z } from "zod";

export const listSchema = z.object({
  query: z.object({ stageId: z.string().min(1) }),
});

export const removeTeamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
  }),
});
