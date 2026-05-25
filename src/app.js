import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import env, { isProd } from "./config/env.js";
import apiRouter from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import auditLog from "./middleware/auditLog.middleware.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.COOKIE_SECRET));

if (!isProd) app.use(morgan("dev"));

app.use(generalLimiter);

// Public static for uploaded broadcast images.
// Telegram fetches the URL when forwarding the photo, so we relax CORP for this scope.
app.use(
  "/uploads",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve(process.cwd(), "uploads"), {
    maxAge: isProd ? "30d" : "1h",
  }),
);

app.use("/api", auditLog, apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
