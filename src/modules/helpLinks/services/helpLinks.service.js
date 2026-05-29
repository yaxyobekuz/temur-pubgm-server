import HelpLink from "../../../models/helpLink.model.js";
import ApiError from "../../../utils/ApiError.js";

export const list = async () => {
  return HelpLink.find().sort({ order: 1, createdAt: 1 });
};

// Active links only, ordered - consumed by the bot's help message.
export const listActive = async () => {
  return HelpLink.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
};

export const getById = async (id) => {
  const link = await HelpLink.findById(id);
  if (!link) throw new ApiError(404, "Havola topilmadi");
  return link;
};

export const create = async (body) => {
  return HelpLink.create({
    name: body.name.trim(),
    url: body.url.trim(),
    order: body.order ?? 0,
    isActive: body.isActive ?? true,
  });
};

export const update = async (id, body) => {
  const link = await getById(id);
  if (body.name !== undefined) link.name = body.name.trim();
  if (body.url !== undefined) link.url = body.url.trim();
  if (body.order !== undefined) link.order = body.order;
  if (body.isActive !== undefined) link.isActive = !!body.isActive;
  await link.save();
  return link;
};

export const remove = async (id) => {
  const link = await getById(id);
  await link.deleteOne();
};
