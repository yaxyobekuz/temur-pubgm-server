import { z } from "zod";
import { SELF_SWITCHABLE_ROLES } from "../../../constants/roles.js";

export const meSwitchRoleSchema = z.object({
  body: z.object({
    newRole: z.enum([...SELF_SWITCHABLE_ROLES]),
  }),
});
