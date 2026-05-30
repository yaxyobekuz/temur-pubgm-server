const PRIVATE_RE = /^https?:\/\/t\.me\/(\+|joinchat\/)/i;
const PUBLIC_RE = /^https?:\/\/t\.me\/(?!\+|joinchat\/)([A-Za-z0-9_]{4,32})\/?$/i;

export const isPrivateTelegramUrl = (url) =>
  typeof url === "string" && PRIVATE_RE.test(url.trim());

export const parsePublicTelegramUsername = (url) => {
  const m = typeof url === "string" ? url.trim().match(PUBLIC_RE) : null;
  return m ? `@${m[1]}` : null;
};

// chatId ustun; aks holda public URL -> @username; aks holda null
export const getTelegramChannelIdentifier = (channel) => {
  if (!channel || channel.type !== "telegram") return null;
  if (channel.chatId) return channel.chatId;
  return parsePublicTelegramUsername(channel.url);
};
