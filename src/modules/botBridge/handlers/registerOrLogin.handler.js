import asyncHandler from "../../../middleware/asyncHandler.js";
import * as botBridge from "../services/botBridge.service.js";

const registerOrLogin = asyncHandler(async (req, res) => {
  const { user, created } = await botBridge.registerOrLogin(req.body);
  res.status(created ? 201 : 200).json({
    success: true,
    data: user,
    message: created ? "Ro'yxatdan o'tildi" : "Tizimga kirildi",
  });
});

export default registerOrLogin;
