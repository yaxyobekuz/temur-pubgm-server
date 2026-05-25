import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import Region from "../models/region.model.js";
import logger from "../config/logger.js";

// O'zbekiston viloyatlari + Toshkent shahar - barchasi Asia/Tashkent vaqt zonasida.
const UZ_REGIONS = [
  { code: "tashkent_city", name: "Toshkent shahri", nameRu: "Город Ташкент" },
  { code: "tashkent", name: "Toshkent viloyati", nameRu: "Ташкентская область" },
  { code: "andijan", name: "Andijon", nameRu: "Андижан" },
  { code: "bukhara", name: "Buxoro", nameRu: "Бухара" },
  { code: "fergana", name: "Farg'ona", nameRu: "Фергана" },
  { code: "jizzakh", name: "Jizzax", nameRu: "Джизак" },
  { code: "namangan", name: "Namangan", nameRu: "Наманган" },
  { code: "navoiy", name: "Navoiy", nameRu: "Навои" },
  { code: "kashkadarya", name: "Qashqadaryo", nameRu: "Кашкадарья" },
  { code: "samarkand", name: "Samarqand", nameRu: "Самарканд" },
  { code: "sirdaryo", name: "Sirdaryo", nameRu: "Сырдарья" },
  { code: "surkhandarya", name: "Surxondaryo", nameRu: "Сурхандарья" },
  { code: "khorezm", name: "Xorazm", nameRu: "Хорезм" },
  { code: "karakalpakstan", name: "Qoraqalpog'iston", nameRu: "Каракалпакстан" },
];

const seed = async () => {
  await connectDB();

  let created = 0;
  let updated = 0;
  for (const r of UZ_REGIONS) {
    const res = await Region.findOneAndUpdate(
      { code: r.code },
      {
        $setOnInsert: {
          code: r.code,
          name: r.name,
          nameRu: r.nameRu,
          timezone: "Asia/Tashkent",
          isActive: true,
        },
      },
      { upsert: true, new: false },
    );
    if (res) updated += 1;
    else created += 1;
  }
  logger.info(`Regions seed: ${created} yangi, ${updated} mavjud`);

  await disconnectDB();
};

seed().catch((err) => {
  logger.error({ err }, "Regions seed xato");
  process.exit(1);
});
