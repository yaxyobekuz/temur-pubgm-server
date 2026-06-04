import { z } from "zod";
import { isPrivateTelegramUrl } from "../../../utils/telegram.js";

export const listSchema = z.object({
  query: z.object({ stageId: z.string().min(1) }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const setSecretGroupSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      url: z.string().min(3).max(500),
      chatId: z.string().min(1, "Chat ID majburiy").max(60),
      title: z.string().max(200).optional(),
    })
    .superRefine((data, ctx) => {
      if (!isPrivateTelegramUrl(data.url)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["url"],
          message: "Maxfiy guruh uchun yopiq (t.me/+...) havola kerak",
        });
      }
    }),
});

export const removeTeamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
  }),
});

export const addTeamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ teamId: z.string().min(1) }),
});
