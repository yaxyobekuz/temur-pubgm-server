import { z } from "zod";

export const registerUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "Ism kerak").max(60),
    lastName: z.string().min(1, "Familiya kerak").max(60),
    username: z.string().min(3, "Username kamida 3 belgidan iborat").max(40),
    phone: z.string().min(9, "Telefon kerak"),
    password: z.string().min(6, "Parol kamida 6 belgidan iborat"),
    // Role value must exist in the `Role` collection; service validates it.
    role: z.string().min(1, "Rol kerak"),

    birthDate: z.union([z.coerce.date(), z.null()]).optional(),
    gender: z.enum(["male", "female"]).nullable().optional(),
    address: z.string().max(200).optional(),
  }),
});
