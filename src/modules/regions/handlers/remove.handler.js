import asyncHandler from "../../../middleware/asyncHandler.js";
import * as regionsService from "../services/regions.service.js";

const remove = asyncHandler(async (req, res) => {
  const result = await regionsService.remove(req.params.id);
  res.json({
    success: true,
    message: result.soft ? "Mintaqa nofaol qilindi (foydalanilmoqda)" : "O'chirildi",
  });
});

export default remove;
