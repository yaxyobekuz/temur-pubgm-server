import asyncHandler from "../../../middleware/asyncHandler.js";
import { resolveAudience } from "../services/audience.service.js";

const audiencePreview = asyncHandler(async (req, res) => {
  const audience = await resolveAudience(req.body);
  res.json({ success: true, data: { size: audience.length } });
});

export default audiencePreview;
