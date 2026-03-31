const { Game, RateLimit, sequelize, UserRateLimit } = require("../../models");
const { getUpperestAgentData } = require("../../utils/common.js");
const { response } = require("../../utils/response.js");
const getRateLimits = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "game_id",
      "min_bet",
      "max_bet",
      "createdAt",
      "updatedAt",
    ];
    const allowedDirections = ["ASC", "DESC"];
    let order;
    if (rawOrder && typeof rawOrder === "string") {
      const parts = rawOrder
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const parsed = [];
      for (const part of parts) {
        const [col, dirRaw] = part.split(":").map((s) => s && s.trim());
        if (!col) continue;
        const dir = dirRaw ? dirRaw.toUpperCase() : "ASC";
        if (!allowedSortFields.includes(col)) continue;
        if (!allowedDirections.includes(dir)) continue;
        parsed.push([col, dir]);
      }
      if (parsed.length) order = parsed;
    }
    const includeMap = {
      game: { model: Game, as: "game" },
    };
    const rawInclude = req.query.include;
    let include;
    if (rawInclude && typeof rawInclude === "string") {
      const keys = rawInclude
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const inc = [];
      for (const k of keys) {
        if (includeMap[k]) inc.push(includeMap[k]);
      }
      if (inc.length) include = inc;
    }
    const options = {};
    if (usePagination) {
      options.limit = limit;
      options.offset = (page - 1) * limit;
    }
    if (order) options.order = order;
    if (include) options.include = include;
    if (usePagination && include) options.distinct = true;
    if (usePagination) {
      const rate_limits = await RateLimit.findAndCountAll(options);
      return response(res, 200, true, "Rate limits fetched successfully", {
        rate_limits: rate_limits.rows,
        pagination: {
          total: rate_limits.count,
          page,
          limit,
          totalPages: Math.ceil(rate_limits.count / limit),
        },
      });
    } else {
      const rate_limits = await RateLimit.findAll(options);
      return response(res, 200, true, "Rate limits fetched successfully", {
        rate_limits,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const OperateRateLimits = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (req.body.creates?.length > 0) {
      const insertData = await Promise.all(
        req.body.creates.map(async (item) => {
          return {
            game_id: item.game_id,
            min_bet: item.min_bet,
            max_bet: item.max_bet,
          };
        }),
      );
      const createdRateLimits = await RateLimit.bulkCreate(insertData, {
        transaction: t,
      });
      const upperestUser = await getUpperestAgentData();
      const userRateLimitData = createdRateLimits.map((rl) => ({
        user_id: upperestUser.id,
        rate_limit_id: rl.id,
      }));
      await UserRateLimit.bulkCreate(userRateLimitData, { transaction: t });
    }
    if (req.body.updates?.length > 0) {
      for (const item of req.body.updates) {
        const updateFields = {
          game_id: item.game_id,
          min_bet: item.min_bet,
          max_bet: item.max_bet,
        };
        await RateLimit.update(updateFields, {
          where: { id: item.id },
          transaction: t,
        });
      }
    }
    if (req.body.deletes?.length > 0) {
      await RateLimit.destroy({
        where: { id: req.body.deletes },
        transaction: t,
      });
    }
    await t.commit();
    return response(res, 200, true, "Data Operation Successful.");
  } catch (error) {
    if (t) await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};
module.exports = {
  getRateLimits,
  OperateRateLimits,
};
