import asyncHandler from "../../../middleware/asyncHandler.js";
import * as regionsService from "../services/regions.service.js";
import { parsePagination, buildMeta } from "../../../utils/pagination.js";

const list = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const isActive =
    req.query.isActive === undefined
      ? undefined
      : req.query.isActive === "true" || req.query.isActive === true;

  const { items, total } = await regionsService.list({
    search: req.query.search,
    isActive,
    page,
    limit,
  });
  res.json({
    success: true,
    data: items,
    meta: buildMeta({ page, limit, total }),
  });
});

export default list;
