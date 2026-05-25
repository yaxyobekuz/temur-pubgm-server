import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import Region from "../models/region.model.js";
import logger from "../config/logger.js";

// Bootstrap mintaqalar - owner panelda yangilarini qo'shishi mumkin.
// gmtOffset = GMT'dan farq (musbat sharq, manfiy g'arb).
const DEFAULT_REGIONS = [
  { name: "O'zbekiston", gmtOffset: 5 },
  { name: "Rossiya", gmtOffset: 3 },
];

const seed = async () => {
  await connectDB();

  // Eski schema bilan yozilgan barcha hujjatlarni va eski indekslarni (code_1, isActive_1) tozalash.
  // Collection drop - Mongoose qayta yaratadi yangi indekslar (name_1 unique) bilan.
  try {
    await Region.collection.drop();
    logger.info("Eski regions collection o'chirildi (indekslar bilan)");
  } catch (err) {
    if (err.code !== 26) throw err; // 26 = NamespaceNotFound (collection mavjud emas)
  }
  await Region.syncIndexes();

  let created = 0;
  for (const r of DEFAULT_REGIONS) {
    await Region.create(r);
    created += 1;
  }
  logger.info(`Regions seed: ${created} yangi mintaqa`);

  await disconnectDB();
};

seed().catch((err) => {
  logger.error({ err }, "Regions seed xato");
  process.exit(1);
});
