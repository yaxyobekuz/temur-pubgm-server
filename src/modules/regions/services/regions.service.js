import Region from "../../../models/region.model.js";
import User from "../../../models/user.model.js";
import ApiError from "../../../utils/ApiError.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const list = async ({ search, page = 1, limit = 50 }) => {
  const filter = {};
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.name = rx;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Region.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Region.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

export const listPublic = async () => {
  return Region.find().sort({ name: 1 });
};

export const getById = async (id) => {
  const region = await Region.findById(id);
  if (!region) throw new ApiError(404, "Mintaqa topilmadi");
  return region;
};

export const create = async (body) => {
  const name = body.name.trim();
  const exists = await Region.findOne({ name });
  if (exists) throw new ApiError(409, "Bu nomli mintaqa allaqachon mavjud");
  return Region.create({
    name,
    gmtOffset: Number(body.gmtOffset),
  });
};

export const update = async (id, body) => {
  const region = await getById(id);

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name !== region.name) {
      const clash = await Region.findOne({ name });
      if (clash) throw new ApiError(409, "Bu nomli mintaqa allaqachon mavjud");
      region.name = name;
    }
  }
  if (body.gmtOffset !== undefined) {
    region.gmtOffset = Number(body.gmtOffset);
  }

  await region.save();
  return region;
};

export const remove = async (id) => {
  const region = await getById(id);
  const inUse = await User.exists({ region: region._id });
  if (inUse) {
    throw new ApiError(
      409,
      "Mintaqa foydalanuvchilar tomonidan ishlatilmoqda - o'chirib bo'lmaydi",
    );
  }
  await region.deleteOne();
};
