const { Desk, Scanner, Game, Role, sequelize } = require("../../models");
const {
  getAllHierarchyMembers,
  getUpperestAgentData,
} = require("../../utils/common.js");
const { response } = require("../../utils/response.js");
const {
  createDeskSchema,
  updateDeskSchema,
} = require("../../validations/desk.validation.js");
const { Op } = require("sequelize");

const getDesks = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "game_id",
      "name",
      "baccarat_type",
      "desk_no",
      "position",
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
      scanners: { model: Scanner, as: "scanners" },
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
    if (req.query.likeName) {
      whereClause.name = {
        [Op.like]: `%${req.query.likeName}%`,
      };
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
    if (usePagination) {
      const desks = await Desk.findAndCountAll(options);
      return response(res, 200, true, "Desks fetched successfully", {
        desks: desks.rows,
        pagination: {
          total: desks.count,
          page,
          limit,
          totalPages: Math.ceil(desks.count / limit),
        },
      });
    } else {
      const desks = await Desk.findAll(options);
      return response(res, 200, true, "Desks fetched successfully", {
        desks,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getDesk = async (req, res) => {
  try {
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
    if (include) options.include = include;
    if (include) options.distinct = true;
    const desk = await Desk.findByPk(req.params.id, options);
    if (!desk) return response(res, 404, false, "Desk not found");
    response(res, 200, true, "Desk fetched successfully", { desk });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const createDesk = async (req, res) => {
  try {
    const { error, value } = createDeskSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);
    const exists = await Desk.findOne({ where: { name: value.name } });
    if (exists) return response(res, 400, false, "Desk name already exists");
    const desk = await Desk.create(value);
    response(res, 201, true, "Desk created successfully", { desk });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateDesk = async (req, res) => {
  try {
    const { error, value } = updateDeskSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);
    const desk = await Desk.findByPk(req.params.id);
    if (!desk) return response(res, 404, false, "Desk not found");
    await desk.update(value);
    response(res, 200, true, "Desk updated successfully", { desk });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteDesk = async (req, res) => {
  try {
    const desk = await Desk.findByPk(req.params.id);
    if (!desk) return response(res, 404, false, "Desk not found");
    await desk.destroy();
    response(res, 200, true, "Desk deleted successfully");
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getTabletopReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateCondition = "";
    let userCondition = "";
    let replacements = {};
    const userRole = await Role.findOne({
      where: { id: req.user.role_id },
    });
    let upperestUser;
    if (userRole.name === "developer") {
      upperestUser = await getUpperestAgentData();
    }
    const creatorAccount =
      userRole.name === "developer"
        ? upperestUser.account
        : userRole.name === "sub_account"
          ? req.user.creator_account
          : req.user.account;
    const members = await getAllHierarchyMembers(creatorAccount);
    if (members && members.length > 0) {
      userCondition = "AND b.user_id IN (:members)";
      replacements.members = members;
    }
    if (startDate && endDate) {
      dateCondition = "AND gr.createdAt BETWEEN :startDate AND :endDate";
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }
    if (startDate && !endDate) {
      dateCondition = "AND gr.createdAt >= :startDate";
      replacements.startDate = startDate;
    }
    if (!startDate && endDate) {
      dateCondition = "AND gr.createdAt <= :endDate";
      replacements.endDate = endDate;
    }
    const [tabletopReports] = await sequelize.query(
      `
      SELECT 
        d.id,
        d.name,
        d.desk_no,
        COALESCE(
          SUM(
            CASE WHEN br.cancel_flg = TRUE OR (br.cancel_flg = FALSE AND br.settle_flg = TRUE)
              THEN br.amount 
              ELSE 0 
            END
          ), 0
        ) AS total_amount,
        COALESCE(
          SUM(
            CASE WHEN br.cancel_flg = FALSE AND br.settle_flg = TRUE AND br.win_lose_flg IS NOT NULL
              THEN br.amount 
              ELSE 0 
            END
          ), 0
        ) AS valid_total_amount,
        COALESCE(
          SUM(
            CASE WHEN br.cancel_flg = FALSE AND br.settle_flg = TRUE AND br.win_lose_flg IS NOT NULL
              THEN 
                CASE WHEN br.win_lose_flg = TRUE 
                  THEN br.actual_win_lose_amount
                  ELSE -br.actual_win_lose_amount 
                END
              ELSE 0
            END
          )
        ) AS win_lose_total_amount,
        COALESCE(
          SUM(
            CASE 
              WHEN br.cancel_flg = TRUE OR br.settle_flg = FALSE THEN 0
              WHEN d.name LIKE '%N%' OR d.name = 'G20' THEN 0
              WHEN r.key IN ('big', 'small', 'dragonSingle', 'dragonDouble', 'tigerDouble', 'tigerSingle') THEN 0
              WHEN br.win_lose_flg IS NULL THEN 0
              WHEN r.key IN ('banker', 'player') THEN
                COALESCE(
                  (SELECT 
                    CASE 
                      WHEN u.bonus_type = 'single' THEN
                        CASE 
                          WHEN br.win_lose_flg = FALSE 
                            AND br.amount > COALESCE(opp.amount, 0)
                          THEN br.amount - COALESCE(opp.amount, 0)
                          ELSE 0
                        END
                      WHEN u.bonus_type = 'both' THEN
                        CASE 
                          WHEN br.amount > COALESCE(opp.amount, 0)
                          THEN br.amount - COALESCE(opp.amount, 0)
                          ELSE 0
                        END
                      ELSE 0
                    END
                  FROM BetResults opp
                  JOIN Results r_opp ON opp.result_id = r_opp.id
                  WHERE opp.bet_id = br.bet_id 
                    AND r_opp.key IN ('banker', 'player') 
                    AND r_opp.key != r.key
                  LIMIT 1
                  ),
                  CASE 
                    WHEN (u.bonus_type = 'single' AND br.win_lose_flg = FALSE) OR u.bonus_type = 'both' 
                      THEN br.amount
                    ELSE 0 
                  END
                )
              WHEN r.key IN ('dragon', 'tiger') THEN 
                COALESCE(
                  (SELECT 
                    CASE 
                      WHEN u.bonus_type = 'single' THEN
                        CASE 
                          WHEN br.win_lose_flg = FALSE 
                            AND br.amount > COALESCE(opp.amount, 0)
                        THEN (br.amount - COALESCE(opp.amount, 0)) * (u.bonus_rate / 100)
                        ELSE 0
                      END
                    WHEN u.bonus_type = 'both' THEN
                      CASE 
                        WHEN br.amount > COALESCE(opp.amount, 0)
                        THEN (br.amount - COALESCE(opp.amount, 0)) * (u.bonus_rate / 100)
                        ELSE 0
                      END
                    ELSE 0
                  END
                  FROM BetResults opp
                  JOIN Results r_opp ON opp.result_id = r_opp.id
                  WHERE opp.bet_id = br.bet_id 
                    AND r_opp.key IN ('dragon', 'tiger') 
                    AND r_opp.key != r.key
                  LIMIT 1
                  ),
                  CASE 
                    WHEN (u.bonus_type = 'single' AND br.win_lose_flg = FALSE) OR u.bonus_type = 'both' 
                      THEN br.amount
                    ELSE 0 
                  END
                )
              ELSE 
                CASE 
                  WHEN (u.bonus_type = 'single' AND br.win_lose_flg = FALSE) OR u.bonus_type = 'both' 
                    THEN br.amount
                  ELSE 0 
                END
              END
          ), 0
        ) AS wash_code_volume,
        COALESCE(
          SUM(
            CASE 
              WHEN r.key = 'banker' AND EXISTS (
                SELECT 1 FROM RoundResults rr
                JOIN Results r_round ON rr.result_id = r_round.id
                WHERE rr.round_id = gr.id AND r_round.key in ('supertwoSix', 'superthreeSix')
              ) THEN br.actual_win_lose_amount
              ELSE 0 
            END
          )
          , 0
        ) AS water_bill
      FROM Desks d
        LEFT JOIN GameSessions gs 
          ON gs.desk_id = d.id
        LEFT JOIN GameRounds gr 
          ON gr.session_id = gs.id 
          ${dateCondition}
        LEFT JOIN Bets b 
          ON b.round_id = gr.id
          ${userCondition}
        LEFT JOIN Users u 
          ON b.user_id = u.id 
        LEFT JOIN BetResults br 
          ON br.bet_id = b.id
        LEFT JOIN Results r 
          ON br.result_id = r.id
      GROUP BY d.id
      ORDER BY d.id;
    `,
      { replacements },
    );
    return response(res, 200, true, "Tabletop Reports fetched successfully", {
      tabletopReports,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getDesks,
  getDesk,
  createDesk,
  updateDesk,
  deleteDesk,
  getTabletopReports,
};
