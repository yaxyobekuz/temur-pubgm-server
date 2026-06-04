// Telefon raqamni yagona kanonik formatga keltiradi: 998XXXXXXXXX (12 raqam)
export const normalizePhone = (raw) => {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (normalized.length === 9) normalized = `998${normalized}`;
  if (normalized.length === 12 && normalized.startsWith("998")) return normalized;

  return null;
};

export const isPhoneLike = (raw) => /^[\d+\-()\s]+$/.test(String(raw || ""));

// Telegram tasdiqlagan har qanday davlat raqamini kanonik xalqaro formatga keltiradi: "998901234567",
// "79161234567" (faqat raqamlar, boshidagi + olib tashlanadi). 998-ga majburlamaydi.
// Faqat bot ro'yxati uchun (raqam Telegram tomonidan allaqachon tasdiqlangan).
export const sanitizeIntlPhone = (raw) => {
  if (raw == null) return null;
  const digits = String(raw).replace(/\D+/g, "");
  // E.164 bo'yicha raqam 8..15 ta raqamdan iborat bo'ladi.
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
};

export default normalizePhone;
