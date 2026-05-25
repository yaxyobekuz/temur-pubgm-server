import asyncHandler from "../../../middleware/asyncHandler.js";
import * as service from "../services/matches.service.js";

const broadcastRoom = asyncHandler(async (req, res) => {
  const { match, job } = await service.broadcastRoomCredentials(req.params.id, req.user);
  res.status(201).json({
    success: true,
    data: { match, job },
    message: "Xona ma'lumotlari yuborishga navbatga qo'yildi",
  });
});

export default broadcastRoom;
