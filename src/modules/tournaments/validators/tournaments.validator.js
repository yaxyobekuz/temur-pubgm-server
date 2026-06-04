import { z } from "zod";
import {
  TOURNAMENT_STATUS,
  TOURNAMENT_MODE,
} from "../../../constants/tournament.js";
import { isPrivateTelegramUrl } from "../../../utils/telegram.js";

export const listSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.enum(Object.values(TOURNAMENT_STATUS)).optional(),
    mode: z.enum(Object.values(TOURNAMENT_MODE)).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  }),
});

export const idSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const createSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120),
    banner: z.string().max(500).optional(),
    description: z.string().max(2000).optional(),
    prizePool: z.string().max(120).optional(),
    mode: z.enum(Object.values(TOURNAMENT_MODE)),
    startDate: z.union([z.coerce.date(), z.string().min(1)]).optional(),
    maps: z.array(z.string().min(1).max(60)).optional(),
    maxTeams: z.number().int().min(1).max(1000).optional(),
    adminContactUrl: z.string().max(500).optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      title: z.string().min(2).max(120).optional(),
      banner: z.string().max(500).optional(),
      description: z.string().max(2000).optional(),
      prizePool: z.string().max(120).optional(),
      mode: z.enum(Object.values(TOURNAMENT_MODE)).optional(),
      startDate: z.union([z.coerce.date(), z.null()]).optional(),
      maps: z.array(z.string().min(1).max(60)).optional(),
      maxTeams: z.number().int().min(1).max(1000).optional(),
      adminContactUrl: z.string().max(500).optional(),
    })
    .refine((b) => Object.keys(b).length > 0, {
      message: "Hech bo'lmaganda bitta maydon kerak",
    }),
});

export const changeStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    next: z.enum(Object.values(TOURNAMENT_STATUS)),
  }),
});

export const promoteSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    groups: z
      .array(
        z.object({
          groupId: z.string().min(1),
          places: z
            .array(
              z.object({
                place: z.number().int().min(1),
                registrationId: z.string().min(1),
              }),
            )
            .default([]),
        }),
      )
      .min(1, "Hech bo'lmaganda bitta guruh tanlang"),
  }),
});

export const openVipSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    registrationId: z.string().min(1),
  }),
});

export const finalPlacementsSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    placements: z
      .array(
        z.object({
          registrationId: z.string().min(1),
          place: z.number().int().min(1).max(3),
        }),
      )
      .min(1)
      .max(3)
      .refine((a) => new Set(a.map((p) => p.place)).size === a.length, "O'rin takrorlanmasligi kerak")
      .refine(
        (a) => new Set(a.map((p) => p.registrationId)).size === a.length,
        "Komanda takrorlanmasligi kerak",
      ),
  }),
});

export const addSponsorSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      type: z.enum(["telegram", "social"]),
      title: z.string().min(1).max(120),
      url: z.string().min(3).max(500),
      chatId: z.string().max(60).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.type !== "telegram") return;
      if (isPrivateTelegramUrl(data.url) && !data.chatId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["chatId"],
          message: "Yopiq kanal uchun Chat ID kiritish majburiy",
        });
      }
    }),
});

export const removeSponsorSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    channelId: z.string().min(1),
  }),
});
