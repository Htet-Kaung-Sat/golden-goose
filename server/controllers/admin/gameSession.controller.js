const { Desk, GameSession, User, Role, sequelize } = require("../../models");
const {
  getAllHierarchyMembers,
  getUpperestAgentData,
} = require("../../utils/common.js");
const { response } = require("../../utils/response.js");
const {
  createGameSessionSchema,
  updateGameSessionSchema,
} = require("../../validations/gameSession.validation.js");
const { Op } = require("sequelize");

const getGameSessions = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "desk_id",
      "user_id",
      "session_no",
      "status",
      "start_time",
      "end_time",
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
      desk: { model: Desk, as: "desk" },
      user: { model: User, as: "user" },
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
    if (req.query.desk_id) {
      whereClause.desk_id = req.query.desk_id;
    }
    if (req.query.startDate || req.query.endDate) {
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      whereClause.start_time = {};
      if (startDate) whereClause.start_time[Op.gte] = new Date(startDate);
      if (endDate) whereClause.start_time[Op.lte] = new Date(endDate);
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
    let sessions;
    let count = 0;
    if (usePagination) {
      const result = await GameSession.findAndCountAll(options);
      sessions = result.rows;
      count = result.count;
    } else {
      sessions = await GameSession.findAll(options);
    }
    if (usePagination) {
      return response(res, 200, true, "Game sessions fetched successfully", {
        sessions: sessions,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } else {
      return response(res, 200, true, "Game sessions fetched successfully", {
        sessions,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getGameSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await GameSession.findByPk(id, {
      include: [
        { model: Desk, as: "desk" },
        { model: User, as: "user" },
      ],
    });

    if (!session) return response(res, 404, false, "GameSession not found");

    response(res, 200, true, "GameSession fetched successfully", { session });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const createGameSession = async (req, res) => {
  try {
    const { error, value } = createGameSessionSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const session = await GameSession.create(value);
    response(res, 201, true, "GameSession created successfully", { session });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateGameSession = async (req, res) => {
  try {
    const { error, value } = updateGameSessionSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const { id } = req.params;
    const session = await GameSession.findByPk(id);
    if (!session) return response(res, 404, false, "GameSession not found");

    await session.update(value);
    response(res, 200, true, "GameSession updated successfully", { session });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteGameSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await GameSession.findByPk(id);
    if (!session) return response(res, 404, false, "GameSession not found");

    await session.destroy();
    response(res, 200, true, "GameSession deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getBootReports = async (req, res) => {
  try {
    const { startDate, endDate, deskId } = req.query;
    let whereClauses = [];
    const replacements = {};
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
      if (!isNaN(deskId)) {
        whereClauses.push(`d.id = :deskId`);
        replacements.deskId = deskId;
      }
      whereClauses.push(`b.user_id IN (:members)`);
      replacements.members = members;
      if (startDate && endDate) {
        whereClauses.push(`gs.start_time BETWEEN :startDate AND :endDate `);
        replacements.startDate = startDate;
        replacements.endDate = endDate;
      }
      if (startDate && !endDate) {
        whereClauses.push(`gs.start_time >= :startDate`);
        replacements.startDate = startDate;
      }
      if (!startDate && endDate) {
        whereClauses.push(`gs.start_time <= :endDate`);
        replacements.endDate = endDate;
      }
      const whereSQL = whereClauses.length
        ? "WHERE " + whereClauses.join(" AND ")
        : "";
      const [bootReports] = await sequelize.query(
        `
        SELECT 
          gs.id,
          gs.session_no AS shoe_size,
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
            )
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
                      AND r_opp.key IN ('banker', 'player') 
                      AND r_opp.key != r.key
                    LIMIT 1
                    ),
                    CASE 
                      WHEN (u.bonus_type = 'single' AND br.win_lose_flg = FALSE) OR u.bonus_type = 'both' 
                        THEN br.amount * (u.bonus_rate / 100)
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
                        THEN br.amount * (u.bonus_rate / 100)
                      ELSE 0 
                    END
                  )
                ELSE 
                  CASE 
                    WHEN (u.bonus_type = 'single' AND br.win_lose_flg = FALSE) OR u.bonus_type = 'both' 
                      THEN br.amount * (u.bonus_rate / 100)
                    ELSE 0 
                  END
                END
            ), 0
          ) AS commission_fee
        FROM GameSessions gs
          INNER JOIN GameRounds gr 
            ON gr.session_id = gs.id
          INNER JOIN Bets b 
            ON b.round_id = gr.id
          INNER JOIN BetResults br 
            ON br.bet_id = b.id
          INNER JOIN Results r 
            ON br.result_id = r.id
          INNER JOIN Desks d 
            ON gs.desk_id = d.id
          INNER JOIN Users u 
            ON b.user_id = u.id
        ${whereSQL}
        GROUP BY gs.id
        ORDER BY gs.id;
        `,
        { replacements },
      );
      response(res, 200, true, "Boot Reports fetched successfully", {
        bootReports,
      });
    } else {
      response(res, 200, true, "Boot Reports fetched successfully", {
        bootReports: [],
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getGameSessions,
  getGameSession,
  createGameSession,
  updateGameSession,
  deleteGameSession,
  getBootReports,
};
