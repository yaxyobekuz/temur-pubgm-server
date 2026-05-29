import { z } from "zod";

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Joriy parolni kiriting"),
    newPassword: z.string().min(6, "Yangi parol kamida 6 belgidan iborat bo'lsin"),
  }),
});
