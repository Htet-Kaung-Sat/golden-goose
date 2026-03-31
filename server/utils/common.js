const { Role, sequelize, User } = require("../models");

const getAllHierarchyMembers = async (account) => {
  let replacements = { account };
  const sqlQuery = `
    WITH RECURSIVE AgentHierarchy AS (
      SELECT
        actual_parent.account
      FROM
        Users actual_parent
      WHERE
        actual_parent.account = :account
      UNION ALL
      SELECT
        child.account
      FROM
        Users child
        INNER JOIN AgentHierarchy parent
          ON child.creator_account = parent.account
    )
    SELECT
      DISTINCT u.id
    FROM
      Users u
      INNER JOIN AgentHierarchy ah
        ON u.creator_account = ah.account
      LEFT JOIN Roles r
        ON u.role_id = r.id
    WHERE
      r.name = "member"
  `;
  const membersResult = await sequelize.query(sqlQuery, { replacements });
  if (membersResult && membersResult[0]) {
    return membersResult[0].map((member) => member.id);
  } else {
    return [];
  }
};

const getAllHierarchyAgents = async (account) => {
  let replacements = { account };
  const sqlQuery = `
    WITH RECURSIVE DescendantAgents AS ( 
      SELECT
        u.id
        , u.account
        , u.creator_account
        , u.role_id
        , 0 AS level_depth 
      FROM
        Users u 
      WHERE
        u.account = :account 
      UNION ALL 
      SELECT
        u.id
        , u.account
        , u.creator_account
        , u.role_id
        , da.level_depth + 1 
      FROM
        Users u 
        INNER JOIN DescendantAgents da 
          ON u.creator_account = da.account
    ) 
    SELECT DISTINCT
      da.id 
    FROM
      DescendantAgents da 
    WHERE
      da.role_id = (SELECT id FROM Roles WHERE name = "agent") 
    ORDER BY
      da.id`;
  const results = await sequelize.query(sqlQuery, { replacements });
  if (results && results[0]) {
    return results[0].map((result) => result.id);
  } else {
    return [];
  }
};

const getAllHierarchyUsers = async (account, notRoot = false) => {
  let replacements = { account };
  const rootFilter = notRoot ? "AND da.level_depth > 0" : "";
  const sqlQuery = `
    WITH RECURSIVE AllDescendants AS ( 
      SELECT
        u.id
        , u.account
        , u.creator_account
        , u.role_id
        , (SELECT name FROM Roles WHERE id = u.role_id) AS role_name
        , 0 AS level_depth 
      FROM
        Users u 
      WHERE
        u.account = :account 
      UNION ALL 
      SELECT
        u.id
        , u.account
        , u.creator_account
        , u.role_id
        , (SELECT name FROM Roles WHERE id = u.role_id) AS role_name
        , da.level_depth + 1 
      FROM
        Users u 
        INNER JOIN AllDescendants da 
          ON u.creator_account = da.account
    ) 
    SELECT DISTINCT
      da.id 
    FROM
      AllDescendants da 
    WHERE
      da.role_name in ("agent", "member")
      ${rootFilter}
    ORDER BY
      da.id DESC`;
  const results = await sequelize.query(sqlQuery, { replacements });
  if (results && results[0]) {
    return results[0].map((result) => result.id);
  } else {
    return [];
  }
};

const getTotalBalance = async (account) => {
  let replacements = { account };
  const sqlQuery = `
    WITH RECURSIVE AgentHierarchy AS ( 
      SELECT
        u.account
        , u.balance
        , u.creator_account 
      FROM
        Users u 
      WHERE
        u.account = :account 
      UNION ALL 
      SELECT
        u_child.account
        , u_child.balance
        , u_child.creator_account 
      FROM
        Users u_child 
        INNER JOIN AgentHierarchy ah 
          ON u_child.creator_account = ah.account
    ) 
    SELECT
      SUM(balance) AS total_balance 
    FROM
      AgentHierarchy`;
  const results = await sequelize.query(sqlQuery, { replacements });
  if (results && results[0]) {
    return results?.[0]?.[0]?.total_balance;
  } else {
    return 0;
  }
};

const getDirectOwnCommission = async (
  user,
  startDate,
  endDate,
  userType,
  actualFlg,
) => {
  const jsRound = (val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : parseFloat(num.toFixed(3));
  };
  const account = user.account;
  const totalbalance = await getTotalBalance(account);
  const targetBonusType = user.bonus_type;
  const targetBonusRate = user.bonus_rate;
  const accountFor = user.share_rate ? user.share_rate : 0;
  const parentAccFor = 100 - user.share_rate;
  let replacements = {
    account,
    totalbalance,
    targetBonusType,
    targetBonusRate,
    accountFor,
    parentAccFor,
  };
  let whereClauses = [];
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
  if (userType === "agent") {
    const relatedMembers = await getAllHierarchyMembers(account);
    if (relatedMembers && relatedMembers.length > 0) {
      whereClauses.push(`b.user_id IN (:relatedMembers)`);
      replacements.relatedMembers = relatedMembers;
    } else {
      return {};
    }
  } else {
    const memberId = user.id;
    whereClauses.push(`b.user_id = :memberId`);
    replacements.memberId = memberId;
  }
  const whereSQL = whereClauses.length
    ? "WHERE " + whereClauses.join(" AND ")
    : "";
  const sqlQuery = `
    WITH BaseCalculations AS (
      SELECT
        SUM(
          CASE WHEN br.cancel_flg = TRUE OR (br.cancel_flg = FALSE AND br.settle_flg = TRUE)
            THEN br.amount 
            ELSE 0 
          END
        ) AS total_amount,
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
      FROM Users u
        LEFT JOIN Bets b ON b.user_id = u.id
        LEFT JOIN BetResults br ON br.bet_id = b.id
        LEFT JOIN GameRounds gr ON b.round_id = gr.id
        LEFT JOIN GameSessions gs ON gr.session_id = gs.id
        LEFT JOIN Desks d ON gs.desk_id = d.id
        LEFT JOIN Results r ON br.result_id = r.id
      ${whereSQL}
    )
    SELECT 
      COALESCE(total_amount, 0) AS total_amount,
      COALESCE(valid_total_amount, 0) AS valid_total_amount,
      COALESCE(wash_code_amount, 0) AS wash_code_amount,
      COALESCE(win_lose_total_amount, 0) AS win_lose_total_amount,
      COALESCE(wash_code_payment, 0) AS wash_code_payment,
      (COALESCE(win_lose_total_amount, 0) + COALESCE(wash_code_payment, 0)) AS actual_win_lose,
      (COALESCE(win_lose_total_amount, 0) + COALESCE(wash_code_payment, 0)) * (:accountFor / 100) AS divided_into,
      (COALESCE(win_lose_total_amount, 0) + COALESCE(wash_code_payment, 0)) * (:parentAccFor / 100) AS superior_divide
    FROM BaseCalculations
  `;
  const [results] = await sequelize.query(sqlQuery, { replacements });
  if (results[0] || actualFlg) {
    const res = results[0] || {};
    return {
      account,
      name: user.name,
      remaining_amount: user.balance,
      total_balance: totalbalance,
      total_amount: jsRound(res.total_amount),
      bonus_type: user.bonus_type,
      bonus_rate: user.bonus_rate,
      valid_total_amount: jsRound(res.valid_total_amount),
      wash_code_amount: jsRound(res.wash_code_amount),
      win_lose_total_amount: jsRound(res.win_lose_total_amount),
      wash_code_payment: jsRound(res.wash_code_payment),
      actual_win_lose: jsRound(res.actual_win_lose),
      account_for: actualFlg ? "0%" : accountFor + "%",
      divided_into: jsRound(res.divided_into),
      share: actualFlg ? "0%" : parentAccFor + "%",
      superior_divide: jsRound(res.superior_divide),
      action: !actualFlg,
    };
  } else {
    return {};
  }
};

const getUpperestAgentData = async () => {
  const user = await User.findOne({
    order: [["level", "ASC"]],
    include: [
      {
        model: Role,
        as: "role",
        where: { name: "agent" },
      },
    ],
  });
  if (!user) return null;
  return user;
};
module.exports = {
  getAllHierarchyMembers,
  getAllHierarchyAgents,
  getAllHierarchyUsers,
  getTotalBalance,
  getDirectOwnCommission,
  getUpperestAgentData,
};
