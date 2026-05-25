import "dotenv/config";
import crypto from "node:crypto";

const need = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`ENV o'zgaruvchisi yo'q: ${key}`);
  return v;
};

const env = Object.freeze({
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),

  MONGO_URL: need("MONGO_URL"),

  JWT_ACCESS_SECRET: need("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: need("JWT_REFRESH_SECRET"),
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || "15m",
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || "7d",

  COOKIE_SECRET: need("COOKIE_SECRET"),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "localhost",

  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  BOT_SHARED_SECRET:
    process.env.BOT_SHARED_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("ENV o'zgaruvchisi yo'q: BOT_SHARED_SECRET");
        })()
      : crypto.randomBytes(32).toString("hex")),

  BOT_INTERNAL_URL: process.env.BOT_INTERNAL_URL || "http://127.0.0.1:5300",
});

export const isProd = env.NODE_ENV === "production";

export default env;
