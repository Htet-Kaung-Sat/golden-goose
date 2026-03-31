const { Result, Game, sequelize } = require("../../models");
const {
  createResultSchema,
  updateResultSchema,
} = require("../../validations/result.validation");
const { response } = require("../../utils/response.js");

exports.getResults = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "game_id",
      "baccarat_type",
      "position",
      "key",
      "created_at",
      "updated_at",
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
    const whereClause = {};
    if (req.query.game_id) {
      whereClause.game_id = req.query.game_id;
    }
    if (req.query.baccarat_type) {
      whereClause.baccarat_type = req.query.baccarat_type;
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
    let results;
    let count = 0;
    if (usePagination) {
      const result = await Result.findAndCountAll(options);
      results = result.rows;
      count = result.count;
    } else {
      results = await Result.findAll(options);
    }
    if (usePagination) {
      return response(res, 200, true, "Results fetched successfully", {
        results: results,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } else {
      return response(res, 200, true, "Results fetched successfully", {
        results,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

exports.getResult = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Result.findByPk(id, {
      include: [{ model: Game, as: "game" }],
    });

    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Result not found" });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("GET Result Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

exports.createResult = async (req, res) => {
  try {
    const { error } = createResultSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { game_id, baccarat_type, position, key, name, ratio } = req.body;

    const newResult = await Result.create({
      game_id,
      baccarat_type,
      position,
      key,
      name,
      ratio,
    });

    res.status(201).json({
      success: true,
      message: "Result created successfully",
      data: newResult,
    });
  } catch (error) {
    console.error("Create Result Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

exports.updateResult = async (req, res) => {
  try {
    const { error } = updateResultSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { id } = req.params;
    const result = await Result.findByPk(id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Result not found" });
    }

    const { game_id, key, name, ratio } = req.body;
    await result.update({
      game_id,
      baccarat_type,
      position,
      key,
      name,
      ratio,
    });

    res.status(200).json({
      success: true,
      message: "Result updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Update Result Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

exports.deleteResult = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Result.findByPk(id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Result not found" });
    }

    await result.destroy();

    res.status(200).json({
      success: true,
      message: "Result deleted successfully",
    });
  } catch (error) {
    console.error("Delete Result Error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

exports.OperateResults = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (req.body.updates && req.body.updates.length > 0) {
      for (const item of req.body.updates) {
        await Result.update(
          {
            name: item.name,
            ratio: item.ratio,
          },
          {
            where: { id: item.id },
            transaction: t,
          },
        );
      }
    }
    await t.commit();
    response(res, 200, true, "Results Operate Successfully.");
  } catch (error) {
    await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};
