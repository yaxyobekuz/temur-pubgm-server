import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import env from "../config/env.js";

// Minimal HTTP JSON client (no axios) to keep server dependencies stable.
const request = (urlStr, { method = "POST", headers = {}, body, timeoutMs = 10_000 } = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === "https:" ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const req = lib.request(
      {
        method,
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Secret": env.BOT_SHARED_SECRET,
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8") || "{}";
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { raw };
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const err = new Error(parsed.message || `Bot HTTP ${res.statusCode}`);
            err.status = res.statusCode;
            err.body = parsed;
            reject(err);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Bot HTTP timeout"));
    });
    if (data) req.write(data);
    req.end();
  });

export const checkMembership = async ({ tgIds, chatIds }) => {
  const r = await request(`${env.BOT_INTERNAL_URL}/check-membership`, {
    body: { tgIds, chatIds },
  });
  return r?.data || {};
};

export const sendMessage = async ({ chatId, text, parseMode, buttons, mediaUrl }) => {
  const r = await request(`${env.BOT_INTERNAL_URL}/send-message`, {
    body: { chatId, text, parseMode, buttons, mediaUrl },
  });
  return r?.data || {};
};
