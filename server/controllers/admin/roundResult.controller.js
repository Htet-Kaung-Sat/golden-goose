const { sequelize, RoundResult, GameRound, Result } = require("../../models");
const { response } = require("../../utils/response.js");
const {
  createRoundResultSchema,
  updateRoundResultSchema,
} = require("../../validations/roundResult.validation.js");

const getRoundResults = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "round_id",
      "result_id",
      "recalculate_flg",
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
      round: { model: GameRound, as: "round" },
      result: { model: Result, as: "result" },
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
    const whereClause = {};
    if (req.query.round_id) {
      whereClause.round_id = req.query.round_id;
    }
    const options = {};
    if (Object.keys(whereClause).length) options.where = whereClause;
    if (usePagination) {
      options.limit = limit;
      options.offset = (page - 1) * limit;
    }
    if (order) options.order = order;
    if (include) options.include = include;
    if (usePagination && include) options.distinct = true;
    let roundResults;
    let count = 0;
    if (usePagination) {
      const result = await RoundResult.findAndCountAll(options);
      roundResults = result.rows;
      count = result.count;
    } else {
      roundResults = await RoundResult.findAll(options);
    }
    if (usePagination) {
      return response(res, 200, true, "Round Results fetched successfully", {
        roundResults: roundResults,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } else {
      return response(res, 200, true, "Round Results fetched successfully", {
        roundResults,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getRoundResult = async (req, res) => {
  try {
    const roundResult = await RoundResult.findByPk(req.params.id, {
      include: [
        { model: GameRound, as: "round" },
        { model: Result, as: "result" },
      ],
    });

    if (!roundResult) return response(res, 404, false, "RoundResult not found");

    response(res, 200, true, "RoundResult fetched successfully", {
      roundResult,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const createRoundResult = async (req, res) => {
  try {
    const { error, value } = createRoundResultSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const roundResult = await RoundResult.create(value);
    response(res, 201, true, "RoundResult created successfully", {
      roundResult,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateRoundResult = async (req, res) => {
  try {
    const { error, value } = updateRoundResultSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const roundResult = await RoundResult.findByPk(req.params.id);
    if (!roundResult) return response(res, 404, false, "RoundResult not found");

    await roundResult.update(value);
    response(res, 200, true, "RoundResult updated successfully", {
      roundResult,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteRoundResult = async (req, res) => {
  try {
    const roundResult = await RoundResult.findByPk(req.params.id);
    if (!roundResult) return response(res, 404, false, "RoundResult not found");

    await roundResult.destroy();

    response(res, 200, true, "RoundResult deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getRoundResults,
  getRoundResult,
  createRoundResult,
  updateRoundResult,
  deleteRoundResult,
};
