const {
  BetResult,
  Result,
  Bet,
  sequelize,
  User,
  Role,
  GameRound,
  GameSession,
  Desk,
} = require("../../models/index.js");
const { response } = require("../../utils/response.js");
const { Op } = require("sequelize");
const {
  createBetResultSchema,
  updateBetResultSchema,
} = require("../../validations/betResult.validation.js");
const {
  getAllHierarchyMembers,
  getAllHierarchyUsers,
  getDirectOwnCommission,
  getUpperestAgentData,
} = require("../../utils/common.js");

const getBetResults = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const betResults = await BetResult.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [
        {
          model: Result,
          as: "result",
        },
        {
          model: Bet,
          as: "bet",
        },
      ],
    });

    response(res, 200, true, "Bet Results fetched successfully", {
      betResults: betResults.rows,
      pagination: {
        total: betResults.count,
        page,
        limit,
        totalPages: Math.ceil(betResults.count / limit),
      },
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getBetResult = async (req, res) => {
  try {
    const betresult = await BetResult.findByPk(req.params.id, {
      include: [
        {
          model: Result,
          as: "result",
        },
        {
          model: Bet,
          as: "bet",
        },
      ],
    });
    if (!betresult) return response(res, 404, false, "Bet not found");

    response(res, 200, true, "Bet Result fetched successfully", { betresult });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const createBetResult = async (req, res) => {
  try {
    const { error, value } = createBetResultSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);
    const betResult = await BetResult.create(value);
    response(res, 201, true, "Bet result created successfully", { betResult });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateBetResult = async (req, res) => {
  try {
    const { error, value } = updateBetResultSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const betResult = await BetResult.findByPk(req.params.id);
    if (!betResult) return response(res, 404, false, "Bet Result not found");

    await betResult.update(value);
    response(res, 200, true, "Bet Result updated successfully", { betResult });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteBetResult = async (req, res) => {
  try {
    const betResult = await BetResult.findByPk(req.params.id);
    if (!betResult) return response(res, 404, false, "Bet Result not found");

    await betResult.destroy();

    response(res, 200, true, "Bet deleted successfully");
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getCodeLookUps = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      customerAccount,
      shoeSize,
      numberOfMouths,
      gameType,
      deskNo,
      cancelFlg,
      recalculationFlg,
      settlementFlg,
      page,
      pageSize,
    } = req.query;
    const limit = parseInt(pageSize) || 20;
    const offset = ((parseInt(page) || 1) - 1) * limit;
    let whereClauses = [];
    let replacements = {};
    replacements.limit = limit;
    replacements.offset = offset;
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
    replacements.creatorAccount = creatorAccount;
    let allUsers = await getAllHierarchyMembers(creatorAccount);
    if (allUsers.length > 0) {
      whereClauses.push(`u.id IN (:allUsers)`);
    } else {
      return response(
        res,
        200,
        true,
        "Code Lookup Reports fetched successfully",
        {
          codeLookups: [],
          pagination: {
            total: 0,
            page: parseInt(page) || 1,
            limit: limit,
            totalPages: 1,
          },
          summaryResult: [
            {
              total_betting_amount: 0,
              total_valid_amount: 0,
              total_win_loss_amount: 0,
              total_rows: 0,
              total_commission: 0,
            },
          ],
        },
      );
    }
    replacements.allUsers = allUsers;
    if (startDate && endDate) {
      whereClauses.push(`br.createdAt BETWEEN :startDate AND :endDate`);
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }
    if (startDate && !endDate) {
      whereClauses.push(`br.createdAt >= :startDate`);
      replacements.startDate = startDate;
    }
    if (!startDate && endDate) {
      whereClauses.push(`br.createdAt <= :endDate`);
      replacements.endDate = endDate;
    }
    if (customerAccount) {
      let allUsers = await getAllHierarchyMembers(creatorAccount);
      const user = await User.findOne({
        where: {
          account: customerAccount,
          id: {
            [Op.in]: allUsers,
          },
        },
      });
      if (!user) {
        return response(res, 403, false, "查无资料");
      } else {
        whereClauses.push(`u.account = :customerAccount`);
        replacements.customerAccount = customerAccount;
      }
    }
    if (shoeSize) {
      whereClauses.push(`gs.session_no = :shoeSize`);
      replacements.shoeSize = shoeSize;
    }
    if (numberOfMouths) {
      whereClauses.push(`gr.round_no = :numberOfMouths`);
      replacements.numberOfMouths = numberOfMouths;
    }
    if (!isNaN(gameType)) {
      whereClauses.push(`g.id = :gameType`);
      replacements.gameType = gameType;
    }
    if (!isNaN(deskNo)) {
      whereClauses.push(`d.id = :deskNo`);
      replacements.deskNo = deskNo;
    }
    if (!isNaN(cancelFlg)) {
      whereClauses.push(`br.cancel_flg = :cancelFlg`);
      replacements.cancelFlg = cancelFlg;
    }
    if (!isNaN(recalculationFlg)) {
      whereClauses.push(`br.recalculate_flg = :recalculationFlg`);
      replacements.recalculationFlg = recalculationFlg;
    }
    if (!isNaN(settlementFlg)) {
      whereClauses.push(`br.settle_flg = :settlementFlg`);
      replacements.settlementFlg = settlementFlg;
    }
    const whereSQL = whereClauses.length
      ? "WHERE " + whereClauses.join(" AND ")
      : "";
    const commissionLogic = `
      CASE 
        WHEN br.cancel_flg = TRUE OR br.settle_flg = FALSE THEN 0
        WHEN d.name LIKE "%N%" OR d.name = "G20" THEN 0
        WHEN r.key IN ("big", "small", "dragonSingle", "dragonDouble", "tigerDouble", "tigerSingle") THEN 0
        WHEN br.win_lose_flg IS NULL THEN 0
        WHEN r.key IN ("banker", "player", "dragon", "tiger") THEN
          COALESCE(
            (SELECT 
               CASE 
                 WHEN u.bonus_type = "single" THEN
                   CASE WHEN br.win_lose_flg = FALSE AND br.amount > COALESCE(opp.amount, 0)
                   THEN (br.amount - COALESCE(opp.amount, 0)) * (u.bonus_rate / 100) ELSE 0 END
                 WHEN u.bonus_type = "both" THEN
                   CASE WHEN br.amount > COALESCE(opp.amount, 0)
                   THEN (br.amount - COALESCE(opp.amount, 0)) * (u.bonus_rate / 100) ELSE 0 END
                 ELSE 0
               END
             FROM BetResults opp
             JOIN Results r_opp ON opp.result_id = r_opp.id
             WHERE opp.bet_id = br.bet_id 
               AND r_opp.key IN ("banker", "player", "dragon", "tiger") 
               AND r_opp.key != r.key
             LIMIT 1
            ),
            CASE 
              WHEN (u.bonus_type = "single" AND br.win_lose_flg = FALSE) OR u.bonus_type = "both"
              THEN br.amount * (u.bonus_rate / 100)
              ELSE 0 
            END
          )
        ELSE 
          CASE 
            WHEN (u.bonus_type = "single" AND br.win_lose_flg = FALSE) OR u.bonus_type = "both"
            THEN (br.amount * (u.bonus_rate / 100))
            ELSE 0 
          END
      END`;

    const [summaryResult] = await sequelize.query(
      `SELECT 
        COALESCE(SUM(br.amount), 0) AS total_betting_amount,
        COALESCE(
          SUM(
            CASE WHEN br.cancel_flg = FALSE && br.settle_flg = TRUE && br.win_lose_flg IS NOT NULL
              THEN br.amount 
              ELSE 0 
            END
          ), 0
        ) AS total_valid_amount,
        COALESCE(
          SUM(
            CASE WHEN br.cancel_flg = FALSE && br.settle_flg = TRUE && br.win_lose_flg IS NOT NULL
              THEN 
                CASE WHEN br.win_lose_flg = TRUE 
                  THEN br.actual_win_lose_amount
                  ELSE -br.actual_win_lose_amount 
                END
              ELSE 0
            END
          ), 0
        ) AS total_win_loss_amount,
        COALESCE(COUNT(DISTINCT br.id), 0) AS total_rows,
        SUM(${commissionLogic}) AS total_commission
      FROM 
        BetResults br
        INNER JOIN Bets b ON br.bet_id = b.id
        INNER JOIN GameRounds gr ON b.round_id = gr.id
        INNER JOIN GameSessions gs ON gr.session_id = gs.id
        INNER JOIN Desks d ON gs.desk_id = d.id
        INNER JOIN Games g ON d.game_id = g.id
        INNER JOIN Users u ON b.user_id = u.id
        INNER JOIN Roles role ON u.role_id = role.id
        INNER JOIN Results r ON br.result_id = r.id
      ${whereSQL}`,
      { replacements },
    );
    const totals = summaryResult[0] || {};
    const totalRows = totals.total_rows || 0;
    const [codeLookUps] = await sequelize.query(
      ` SELECT
          LPAD(br.id, 8, '0') AS order_number,
          u.account AS account_number,
          u.name AS real_name,
          d.name AS desk_name,
          CONCAT(gs.session_no, "_", gr.round_no) AS bureau,
          r.name AS bet_name,
          COALESCE(br.amount, 0) AS betting_amount,
          (
            CASE WHEN br.cancel_flg = FALSE && br.settle_flg = TRUE && br.win_lose_flg IS NOT NULL
              THEN br.amount 
              ELSE 0 
            END
          ) AS valid_amount,
          (${commissionLogic}) AS commission,
          COALESCE(
            (
              CASE WHEN br.cancel_flg = FALSE && br.settle_flg = TRUE AND br.win_lose_flg IS NOT NULL
                THEN CASE 
                  WHEN br.win_lose_flg = TRUE 
                    THEN br.actual_win_lose_amount
                    ELSE -br.actual_win_lose_amount 
                  END
                ELSE 0
              END
            ), 0
          ) AS win_loss_amount,
          CAST(
            (SELECT t_init.before_amount 
            FROM Transactions t_init 
            WHERE t_init.bet_result_id IN (SELECT id FROM BetResults WHERE bet_id = b.id)
            ORDER BY 
              CASE 
                  WHEN br.cancel_flg = 1 THEN t_init.recalculate_no 
                  ELSE -t_init.recalculate_no 
              END ASC, 
              t_init.id ASC
            LIMIT 1)
            + SUM(
                CASE 
                  WHEN br.cancel_flg = 1 THEN 0
                  WHEN br.settle_flg = 0 THEN -br.amount
                  WHEN br.settle_flg = 1 AND br.win_lose_flg = 1 THEN br.actual_win_lose_amount
                  WHEN br.settle_flg = 1 AND br.win_lose_flg = 0 THEN -br.actual_win_lose_amount
                  ELSE 0 
                END
            ) OVER (PARTITION BY b.id ORDER BY br.id ASC)
          AS SIGNED) AS remaining_amount,
          br.win_lose_flg AS win_loss_result,
          r_agg.round_results AS actual_round_results,
          br.createdAt AS betting_time,
          br.updatedAt AS payment_time,
          ANY_VALUE(b.ip_address) AS ip_address,
          br.settle_flg AS bet_state,
          br.cancel_flg AS cancel_flg
        FROM 
          BetResults br
          INNER JOIN 
            Transactions t ON t.bet_result_id = br.id
          INNER JOIN 
            Bets b ON br.bet_id = b.id
          INNER JOIN 
            GameRounds gr ON b.round_id = gr.id
          INNER JOIN 
            GameSessions gs ON gr.session_id = gs.id
          INNER JOIN 
            Desks d ON gs.desk_id = d.id
          INNER JOIN 
            Games g ON d.game_id = g.id
          INNER JOIN 
            Results r ON br.result_id = r.id
          LEFT JOIN (
            SELECT
              rr.round_id,
              GROUP_CONCAT(r.name ORDER BY r.position SEPARATOR ", ") AS round_results
            FROM
              RoundResults rr
              JOIN
                Results r ON rr.result_id = r.id
            GROUP BY
              rr.round_id
          ) AS r_agg ON gr.id = r_agg.round_id
          INNER JOIN 
            Users u ON b.user_id = u.id 
          INNER JOIN 
            Roles role ON u.role_id = role.id
        ${whereSQL}
        GROUP BY 
          br.id
        ORDER BY 
          br.id DESC
        LIMIT :limit 
        OFFSET :offset;
      `,
      { replacements },
    );
    response(res, 200, true, "Code Lookup Reports fetched successfully", {
      codeLookups: codeLookUps,
      pagination: {
        total: totalRows,
        page: parseInt(page) || 1,
        limit: limit,
        totalPages: Math.ceil(totalRows / limit),
      },
      summaryResult: summaryResult,
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getSummaryReports = async (req, res) => {
  try {
    let isMember = false;
    let actualUser = {};
    let loginUserAccount = "";
    const { startDate, endDate, targetAccount } = req.query;
    const userRole = await Role.findOne({
      where: { id: req.user.role_id },
    });
    if (userRole.name === "sub_account") {
      const loginMainUser = await User.findOne({
        where: { account: req.user.creator_account },
      });
      actualUser = loginMainUser;
      loginUserAccount = loginMainUser.account;
    } else if (userRole.name === "developer") {
      const upperestUser = await getUpperestAgentData();
      actualUser = upperestUser;
      loginUserAccount = upperestUser.account;
    } else {
      actualUser = req.user;
      loginUserAccount = req.user.account;
    }
    let allUsers = await getAllHierarchyUsers(loginUserAccount);
    if (targetAccount && targetAccount !== loginUserAccount) {
      const user = await User.findOne({
        where: {
          account: targetAccount,
          id: {
            [Op.in]: allUsers,
          },
        },
        include: [{ model: Role, as: "role" }],
      });
      if (!user) {
        return response(res, 403, false, "查无资料");
      } else {
        if (user.role.name === "member") {
          isMember = true;
        }
        actualUser = user;
      }
    }
    let totalData = [
      {
        total_amount: 0,
        valid_total_amount: 0,
        wash_code_amount: 0,
        win_lose_total_amount: 0,
        wash_code_payment: 0,
        total_win_lose: 0,
      },
    ];
    if (isMember) {
      const summaryReports = [
        {
          id: actualUser?.id,
          account: actualUser?.account,
          name: actualUser?.name,
          remaining_amount: actualUser?.balance,
          total_balance: actualUser?.balance,
          total_amount: 0,
          valid_total_amount: 0,
          wash_code_amount: 0,
          win_lose_total_amount: 0,
          bonus_rate: actualUser?.bonus_rate,
          bonus_type: actualUser?.bonus_type,
          washing_ratio:
            actualUser?.bonus_type === "both"
              ? "双边" +
                parseFloat(Number(actualUser?.bonus_rate).toFixed(3)) +
                "%"
              : actualUser?.bonus_type === "single"
                ? "单边" +
                  parseFloat(Number(actualUser?.bonus_rate).toFixed(3)) +
                  "%"
                : "",
          wash_code_payment: 0,
          actual_win_lose: 0,
          account_for: "0%",
          divided_into: 0,
          share: "0%",
          superior_divide: 0,
          action: false,
        },
      ];
      response(res, 200, true, "Summary Reports fetched successfully", {
        totalData: totalData,
        summaryReports: summaryReports,
        directMembers: [],
      });
    } else {
      const agents = await User.findAll({
        where: { creator_account: actualUser.account },
        include: [
          {
            model: Role,
            as: "role",
            where: { name: "agent" },
            attributes: ["name"],
          },
        ],
        order: [["id", "DESC"]],
      });
      const summaryReports = [];
      const childData = [];
      for (const agent of agents) {
        try {
          const childAgent = await getDirectOwnCommission(
            agent,
            startDate,
            endDate,
            "agent",
            false,
          );
          if (
            childAgent &&
            Object.keys(childAgent).length > 0 &&
            childAgent.total_amount > 0
          ) {
            summaryReports.push(childAgent);
            childData.push(childAgent);
          }
        } catch (error) {
          response(res, 500, false, "Server error", {
            error: `Error fetching commission for agent ${agent.account}:${error}`,
          });
        }
      }
      const loginUser = await User.findOne({
        where: { account: actualUser.account },
      });
      try {
        const loginAgent = await getDirectOwnCommission(
          loginUser,
          startDate,
          endDate,
          "agent",
          true,
        );
        summaryReports.push(loginAgent);
      } catch (error) {
        response(res, 500, false, "Server error", {
          error: `Error fetching commission for agent ${loginUser.account}:${error}`,
        });
      }

      const members = await User.findAll({
        where: { creator_account: actualUser.account },
        include: [
          {
            model: Role,
            as: "role",
            where: { name: "member" },
            attributes: ["name"],
          },
        ],
        order: [["id", "DESC"]],
      });
      const directMembers = [];
      for (const member of members) {
        try {
          const memberData = await getDirectOwnCommission(
            member,
            startDate,
            endDate,
            "member",
            false,
          );
          if (
            memberData &&
            Object.keys(memberData).length > 0 &&
            memberData.total_amount > 0
          ) {
            directMembers.push(memberData);
          }
        } catch (error) {
          response(res, 500, false, "Server error", {
            error: `Error fetching commission for agent ${member.account}:${error}`,
          });
        }
      }
      const combinedData = [...childData, ...directMembers];
      if (combinedData.length > 0) {
        let totalResult = combinedData.reduce(
          (acc, current) => {
            return {
              total_amount:
                acc.total_amount + (Number(current.total_amount) || 0),
              valid_total_amount:
                acc.valid_total_amount +
                (Number(current.valid_total_amount) || 0),
              wash_code_amount:
                acc.wash_code_amount + (Number(current.wash_code_amount) || 0),
              win_lose_total_amount:
                acc.win_lose_total_amount +
                (Number(current.win_lose_total_amount) || 0),
              wash_code_payment:
                acc.wash_code_payment +
                (Number(current.wash_code_payment) || 0),
              total_win_lose:
                acc.total_win_lose + (Number(current.actual_win_lose) || 0), // Note: check if field is actual_win_lose
            };
          },
          {
            total_amount: 0,
            valid_total_amount: 0,
            wash_code_amount: 0,
            win_lose_total_amount: 0,
            wash_code_payment: 0,
            total_win_lose: 0,
          },
        );
        Object.keys(totalResult).forEach((key) => {
          totalResult[key] = parseFloat(totalResult[key].toFixed(3));
        });
        totalData = [totalResult];
      }
      response(res, 200, true, "Summary Reports fetched successfully", {
        totalData: totalData,
        summaryReports: summaryReports,
        directMembers: directMembers.length > 0 ? directMembers : [],
      });
    }
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getDailyReports = async (req, res) => {
  try {
    const { startDate, endDate, customerAccount } = req.query;
    let whereClauses = [];
    let replacements = {};
    if (startDate && endDate) {
      whereClauses.push(`br.createdAt BETWEEN :startDate AND :endDate`);
      replacements.startDate = startDate + " 07:00:00";
      replacements.endDate = endDate + " 06:59:59";
    }
    if (startDate && !endDate) {
      whereClauses.push(`br.createdAt >= :startDate`);
      replacements.startDate = startDate + " 07:00:00";
    }
    if (!startDate && endDate) {
      whereClauses.push(`br.createdAt <= :endDate`);
      replacements.endDate = endDate + " 06:59:59";
    }
    if (customerAccount) {
      const userRole = await Role.findOne({
        where: { id: req.user.role_id },
      });
      let upperestUser;
      if (userRole.name === "developer") {
        upperestUser = await getUpperestAgentData();
      }
      const loginUserAccount =
        userRole.name === "developer"
          ? upperestUser.account
          : userRole.name === "sub_account"
            ? req.user.creator_account
            : req.user.account;
      let allUsers = await getAllHierarchyUsers(loginUserAccount);
      const user = await User.findOne({
        where: {
          account: customerAccount,
          id: {
            [Op.in]: allUsers,
          },
        },
        include: [{ model: Role, as: "role" }],
      });
      if (!user) {
        return response(res, 403, false, "查无资料");
      } else {
        replacements.targetBonusType = user.bonus_type;
        replacements.targetBonusRate = user.bonus_rate;
        const relatedMembers = await getAllHierarchyMembers(customerAccount);
        if (relatedMembers && relatedMembers.length > 0) {
          whereClauses.push(`b.user_id IN (:relatedMembers)`);
          replacements.relatedMembers = relatedMembers;
        } else {
          const memberId = user.id;
          whereClauses.push(`b.user_id = :memberId`);
          replacements.memberId = memberId;
        }
      }
    } else {
      return response(res, 200, true, "Daily Reports fetched successfully", {});
    }
    const whereSQL = whereClauses.length
      ? "WHERE " + whereClauses.join(" AND ")
      : "";
    const [dailyReports] = await sequelize.query(
      ` WITH RawData AS (
          SELECT
            DATE(br.createdAt) AS date,
            COALESCE(SUM(br.amount), 0) AS total_amount,
            COALESCE(
              SUM(
                CASE WHEN br.cancel_flg = FALSE AND br.win_lose_flg IS NOT NULL
                  THEN br.amount 
                  ELSE 0 
                END
              ), 0
            ) AS valid_total_amount,
            COALESCE(
              SUM(
                CASE 
                  WHEN br.cancel_flg = TRUE OR br.settle_flg = FALSE THEN 0
                  WHEN d.name LIKE "%N%" OR d.name = "G20" THEN 0
                  WHEN r.key IN ("big", "small", "dragonSingle", "dragonDouble", "tigerDouble", "tigerSingle") THEN 0
                  WHEN br.win_lose_flg IS NULL THEN 0
                  WHEN r.key IN ("banker", "player") THEN
                    COALESCE(
                      (SELECT 
                        CASE 
                          WHEN :targetBonusType = "single" THEN
                            CASE 
                              WHEN br.win_lose_flg = FALSE 
                                AND br.amount > COALESCE(opp.amount, 0)
                              THEN br.amount - COALESCE(opp.amount, 0)
                              ELSE 0
                            END
                          WHEN :targetBonusType = "both" THEN
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
                        AND r_opp.key IN ("banker", "player") 
                        AND r_opp.key != r.key
                      LIMIT 1
                      ),
                      CASE 
                        WHEN (:targetBonusType = "single" AND br.win_lose_flg = FALSE) OR :targetBonusType = "both"
                          THEN br.amount
                        ELSE 0 
                      END
                    )
                  WHEN r.key IN ("dragon", "tiger") THEN 
                    COALESCE(
                      (SELECT 
                        CASE 
                          WHEN :targetBonusType = "single" THEN
                            CASE 
                              WHEN br.win_lose_flg = FALSE 
                                AND br.amount > COALESCE(opp.amount, 0)
                            THEN br.amount - COALESCE(opp.amount, 0)
                            ELSE 0
                          END
                        WHEN :targetBonusType = "both" THEN
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
                        AND r_opp.key IN ("dragon", "tiger") 
                        AND r_opp.key != r.key
                      LIMIT 1
                      ),
                      CASE 
                        WHEN (:targetBonusType = "single" AND br.win_lose_flg = FALSE) OR :targetBonusType = "both"
                          THEN br.amount
                        ELSE 0 
                      END
                    )
                  ELSE 
                      CASE 
                        WHEN (:targetBonusType = "single" AND br.win_lose_flg = FALSE) OR :targetBonusType = "both"
                          THEN br.amount
                        ELSE 0 
                      END
                  END
              ), 0
            ) AS wash_code_amount,
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
                  WHEN d.name LIKE "%N%" OR d.name = "G20" THEN 0
                  WHEN r.key IN ("big", "small", "dragonSingle", "dragonDouble", "tigerDouble", "tigerSingle") THEN 0
                  WHEN br.win_lose_flg IS NULL THEN 0
                  WHEN r.key IN ("banker", "player") THEN
                    COALESCE(
                      (SELECT 
                        CASE 
                          WHEN :targetBonusType = "single" THEN
                            CASE 
                              WHEN br.win_lose_flg = FALSE 
                                AND br.amount > COALESCE(opp.amount, 0)
                              THEN (br.amount - COALESCE(opp.amount, 0)) * (:targetBonusRate / 100)
                              ELSE 0
                            END
                          WHEN :targetBonusType = "both" THEN
                            CASE 
                              WHEN br.amount > COALESCE(opp.amount, 0)
                              THEN (br.amount - COALESCE(opp.amount, 0)) * (:targetBonusRate / 100)
                              ELSE 0
                            END
                          ELSE 0
                        END
                      FROM BetResults opp
                      JOIN Results r_opp ON opp.result_id = r_opp.id
                      WHERE opp.bet_id = br.bet_id 
                        AND r_opp.key IN ("banker", "player") 
                        AND r_opp.key != r.key
                      LIMIT 1
                      ),
                      CASE 
                        WHEN (:targetBonusType = "single" AND br.win_lose_flg = FALSE) OR :targetBonusType = "both"
                          THEN br.amount * (:targetBonusRate / 100)
                        ELSE 0 
                      END
                    )
                  WHEN r.key IN ("dragon", "tiger") THEN 
                    COALESCE(
                      (SELECT 
                        CASE 
                          WHEN :targetBonusType = "single" THEN
                            CASE 
                              WHEN br.win_lose_flg = FALSE 
                                AND br.amount > COALESCE(opp.amount, 0)
                            THEN (br.amount - COALESCE(opp.amount, 0)) * (:targetBonusRate / 100)
                            ELSE 0
                          END
                        WHEN :targetBonusType = "both" THEN
                          CASE 
                            WHEN br.amount > COALESCE(opp.amount, 0)
                            THEN (br.amount - COALESCE(opp.amount, 0)) * (:targetBonusRate / 100)
                            ELSE 0
                          END
                        ELSE 0
                      END
                      FROM BetResults opp
                      JOIN Results r_opp ON opp.result_id = r_opp.id
                      WHERE opp.bet_id = br.bet_id 
                        AND r_opp.key IN ("dragon", "tiger") 
                        AND r_opp.key != r.key
                      LIMIT 1
                      ),
                      CASE 
                        WHEN (:targetBonusType = "single" AND br.win_lose_flg = FALSE) OR :targetBonusType = "both"
                          THEN br.amount * (:targetBonusRate / 100)
                        ELSE 0 
                      END
                    )
                  ELSE 
                    CASE 
                      WHEN (:targetBonusType = "single" AND br.win_lose_flg = FALSE) OR :targetBonusType = "both"
                        THEN br.amount * (:targetBonusRate / 100)
                      ELSE 0 
                    END
                  END
              ), 0
            ) AS wash_code_payment
          FROM BetResults br
            INNER JOIN Bets b 
              ON br.bet_id = b.id
            INNER JOIN GameRounds gr 
              ON b.round_id = gr.id
            INNER JOIN GameSessions gs
              ON gr.session_id = gs.id
            INNER JOIN Desks d
              ON gs.desk_id = d.id
            INNER JOIN Results r
              ON br.result_id = r.id
            INNER JOIN Users u
              ON b.user_id = u.id 
          ${whereSQL}
          GROUP BY DATE(br.createdAt)
        )
        SELECT 
          *,
          (win_lose_total_amount + wash_code_payment) AS total_win_lose
        FROM RawData
        ORDER BY date DESC;
      `,
      { replacements },
    );
    response(res, 200, true, "Daily Reports fetched successfully", {
      dailyReports,
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getOnlinePlayers = async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return response(res, 400, false, "User ID is required");
    }
    const betResults = await BetResult.findAll({
      where: { settle_flg: false, cancel_flg: false },
      attributes: ["amount", "createdAt"],
      include: [
        {
          model: Result,
          as: "result",
          attributes: ["name"],
        },
        {
          model: Bet,
          as: "bet",
          required: true,
          where: { user_id },
          attributes: ["ip_address"],
          include: [
            {
              model: GameRound,
              as: "gameround",
              required: true,
              attributes: ["round_no"],
              include: [
                {
                  model: GameSession,
                  as: "gameSession",
                  attributes: ["session_no"],
                  include: [
                    {
                      model: Desk,
                      as: "desk",
                      attributes: ["name"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    const onlinePlayers = betResults.map((item) => {
      const deskName = item.bet?.gameround?.gameSession?.desk?.name || "-";
      const sessionNo = item.bet?.gameround?.gameSession?.session_no || "-";
      const roundNo = item.bet?.gameround?.round_no || "-";
      return {
        desk_session_round: `${deskName} / ${sessionNo}-${roundNo}`,
        betting_time: item.createdAt,
        betting_area: item.result?.name || "-",
        bets: item.amount,
        ip: item.bet?.ip_address || "-",
      };
    });
    response(
      res,
      200,
      true,
      "Unfinished round bet results fetched successfully",
      {
        onlinePlayers,
      },
    );
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getBetResults,
  getBetResult,
  createBetResult,
  updateBetResult,
  deleteBetResult,
  getCodeLookUps,
  getSummaryReports,
  getDailyReports,
  getOnlinePlayers,
};
