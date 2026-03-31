const { GameRound, GameSession } = require("../../models");
const { response } = require("../../utils/response.js");
const {
  createGameRoundSchema,
  updateGameRoundSchema,
} = require("../../validations/gameRound.validation.js");
const { Op } = require("sequelize");

const getGameRounds = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "session_id",
      "round_no",
      "status",
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
      gameSession: { model: GameSession, as: "gameSession" },
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
    if (req.query.session_id) {
      whereClause.session_id = req.query.session_id;
    }
    if (req.query.status) {
      whereClause.status = req.query.status;
    }
    if (req.query.startDate || req.query.endDate) {
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt[Op.gte] = new Date(startDate);
      if (endDate) whereClause.createdAt[Op.lte] = new Date(endDate);
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
    let rounds;
    let count = 0;
    if (usePagination) {
      const result = await GameRound.findAndCountAll(options);
      rounds = result.rows;
      count = result.count;
    } else {
      rounds = await GameRound.findAll(options);
    }
    if (usePagination) {
      return response(res, 200, true, "Game rounds fetched successfully", {
        rounds: rounds,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } else {
      return response(res, 200, true, "Game rounds fetched successfully", {
        rounds,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getGameRound = async (req, res) => {
  try {
    const round = await GameRound.findByPk(req.params.id, {
      include: [{ model: GameSession, as: "gameSession" }],
    });

    if (!round) return response(res, 404, false, "Game round not found");

    response(res, 200, true, "Game round fetched successfully", { round });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const createGameRound = async (req, res) => {
  try {
    const { error, value } = createGameRoundSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const round = await GameRound.create(value);
    response(res, 201, true, "Game round created successfully", { round });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateGameRound = async (req, res) => {
  try {
    const { error, value } = updateGameRoundSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const round = await GameRound.findByPk(req.params.id);
    if (!round) return response(res, 404, false, "Game round not found");

    await round.update(value);
    response(res, 200, true, "Game round updated successfully", { round });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteGameRound = async (req, res) => {
  try {
    const round = await GameRound.findByPk(req.params.id);
    if (!round) return response(res, 404, false, "Game round not found");

    await round.destroy();
    response(res, 200, true, "Game round deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getGameRounds,
  getGameRound,
  createGameRound,
  updateGameRound,
  deleteGameRound,
};
