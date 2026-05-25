import { Router } from "express";
import listPublic from "./handlers/listPublic.handler.js";

// Public read endpoint used by the bot for the region picker.
const router = Router();
router.get("/", listPublic);

export default router;
