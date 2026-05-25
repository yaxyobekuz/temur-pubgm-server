import Region from "../../../models/region.model.js";
import User from "../../../models/user.model.js";
import ApiError from "../../../utils/ApiError.js";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const list = async ({ search, isActive, page = 1, limit = 50 }) => {
  const filter = {};
  if (typeof isActive === "boolean") filter.isActive = isActive;
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: rx }, { nameRu: rx }, { code: rx }];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Region.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Region.countDocuments(filter),
  ]);
  return { items, total, page, limit };
};

export const listPublic = async () => {
  return Region.find({ isActive: true }).sort({ name: 1 });
};

export const getById = async (id) => {
  const region = await Region.findById(id);
  if (!region) throw new ApiError(404, "Mintaqa topilmadi");
  return region;
};

export const create = async (body) => {
  const code = String(body.code || "").trim().toLowerCase();
  const exists = await Region.findOne({ code });
  if (exists) throw new ApiError(409, "Bu kod allaqachon mavjud");
  return Region.create({
    name: body.name.trim(),
    nameRu: body.nameRu?.trim() || "",
    code,
    timezone: body.timezone?.trim() || "Asia/Tashkent",
    isActive: body.isActive ?? true,
  });
};

export const update = async (id, body) => {
  const region = await getById(id);

  if (body.name !== undefined) region.name = body.name.trim();
  if (body.nameRu !== undefined) region.nameRu = body.nameRu.trim();
  if (body.code !== undefined) {
    const code = String(body.code).trim().toLowerCase();
    if (code !== region.code) {
      const clash = await Region.findOne({ code });
      if (clash) throw new ApiError(409, "Bu kod allaqachon mavjud");
      region.code = code;
    }
  }
  if (body.timezone !== undefined) region.timezone = body.timezone.trim();
  if (body.isActive !== undefined) region.isActive = !!body.isActive;

  await region.save();
  return region;
};

export const remove = async (id) => {
  const region = await getById(id);
  const inUse = await User.exists({ region: region._id });
  if (inUse) {
    // Soft-deactivate when references exist.
    region.isActive = false;
    await region.save();
    return { soft: true, region };
  }
  await region.deleteOne();
  return { soft: false };
};
