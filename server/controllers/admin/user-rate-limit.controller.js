const {
  RateLimit,
  sequelize,
  User,
  UserRateLimit,
  Role,
} = require("../../models");
const { getAllHierarchyUsers } = require("../../utils/common.js");
const { response } = require("../../utils/response.js");
const { Op } = require("sequelize");
const { createOperationLog } = require("./operation-log.controller.js");

const getBetRateLimits = async (req, res) => {
  try {
    const userId = req.query.id;
    if (!userId) return response(res, 400, false, "user_id is required");
    const query = `
      SELECT
        g.id AS id,
        g.name AS game_name,
        rr.name AS bet_name,
        rr.key AS bet_key,
        rl.min_bet AS game_min_bet,
        rl.max_bet AS game_max_bet,
        rrl.min_bet AS result_min_bet,
        rrl.max_bet AS result_max_bet
      FROM UserRateLimits AS url
        JOIN RateLimits AS rl 
          ON url.rate_limit_id = rl.id 
        JOIN Games AS g 
          ON rl.game_id = g.id 
        JOIN ResultRateLimits AS rrl 
          ON rrl.rate_limit_id = rl.id 
        JOIN Results AS rr 
          ON rrl.result_id = rr.id 
      WHERE url.user_id = :userId
        AND rr.id IN (
          SELECT MIN(r2.id) FROM Results AS r2
          WHERE r2.key != 'superthreeSix'
          GROUP BY r2.game_id, r2.key
        )
      ORDER BY g.id, rr.id, rl.id DESC
    `;
    const betRateLimits = await sequelize.query(query, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT,
    });
    return response(res, 200, true, "Bet limit ranges fetched successfully", {
      betRateLimits,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getUpperUserRateLimits = async (req, res) => {
  try {
    const account = req.query.account;
    let replacements = {};
    replacements.account = account;
    const [rateLimits] = await sequelize.query(
      `
        SELECT 
          url.id AS id,
          g.id AS game_id,
          u.account AS account,
          g.name AS game_name,
          rl.id AS rate_limit_id,
          CONCAT(rl.min_bet, '-', rl.max_bet) AS bet_rate
        FROM UserRateLimits AS url 
          Inner JOIN Users AS u 
            ON u.id = url.user_id 
          Inner JOIN RateLimits AS rl 
            ON rl.id = url.rate_limit_id 
          Inner JOIN Games AS g 
            ON g.id = rl.game_id 
        WHERE u.account = :account
        ORDER BY 
          g.name ASC, 
          rl.min_bet ASC`,
      { replacements },
    );
    response(res, 200, true, "Rate Limit fetched successfully", { rateLimits });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

async function saveUserRateLimits(req, res) {
  const t = await sequelize.transaction();
  try {
    const userId = Number(req.body.user_id);
    const ipLocation = req.body.ip_location;
    const screenName = req.body.screen_name;
    const payload = req.body;
    if (!userId) {
      await t.rollback();
      return response(res, 400, false, "user_id is required");
    }
    if (!Array.isArray(payload.rate_limits)) {
      await t.rollback();
      return response(res, 400, false, "rate_limits must be an array");
    }
    let createdLimits;
    const allRateLimits = await RateLimit.findAll({ transaction: t });
    const rateLimitById = new Map(allRateLimits.map((r) => [r.id, r]));
    const submittedRateLimitIds = payload.rate_limits.map((i) =>
      Number(i.rate_limit_id),
    );
    // Validate submitted IDs exist
    const invalidIds = submittedRateLimitIds.filter(
      (id) => !rateLimitById.has(id),
    );
    if (invalidIds.length) {
      await t.rollback();
      throw new Error(`Invalid rate_limit_id(s): ${invalidIds.join(", ")}`);
    }
    const toInsert = submittedRateLimitIds.map((rate_limit_id) => ({
      user_id: userId,
      rate_limit_id,
    }));
    if (toInsert.length) {
      createdLimits = await UserRateLimit.bulkCreate(toInsert, {
        transaction: t,
      });
    }
    const operateUser = await User.findByPk(userId, {
      include: [{ model: Role, as: "role" }],
    });
    let operatorUserId = req.user.id;
    const userRole = await Role.findOne({
      where: { id: req.user.role_id },
    });
    if (userRole.name !== "developer") {
      if (userRole.name === "sub_account") {
        const userData = await User.findOne({
          where: { account: req.user.creator_account },
        });
        operatorUserId = userData.id;
      }
      const logData = {
        operator_user_id: operatorUserId,
        operated_user_id: operateUser.id,
        action: "new_user",
        newData: {
          rate_limits: payload.rate_limits,
          screen_name: screenName,
          user: operateUser,
        },
        ip_location: ipLocation,
        remark: "",
      };
      await createOperationLog(t, logData);
    }
    await t.commit();
    return response(res, 200, true, "User Rate Limit created successfully", {
      user_id: userId,
      rate_limits: createdLimits,
    });
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function mergeUserRateLimits(req, res) {
  const t = await sequelize.transaction();
  try {
    const userId = Number(req.body.user_id);
    const ipLocation = req.body.ip_location;
    const screenName = req.body.screen_name;
    const payload = req.body;
    if (!userId) {
      await t.rollback();
      return response(res, 400, false, "user_id is required");
    }
    if (!Array.isArray(payload.rate_limits)) {
      await t.rollback();
      return response(res, 400, false, "rate_limits must be an array");
    }
    const incomingRateLimits = req.body.rate_limits || [];
    const incomingIds = incomingRateLimits.map((item) => item.rate_limit_id);
    const oldLimits = await UserRateLimit.findAll({
      where: { user_id: userId },
      attributes: ["rate_limit_id"],
      transaction: t,
    });
    const existingLimits = await UserRateLimit.findAll({
      where: { user_id: userId },
      transaction: t,
    });
    const existingIds = existingLimits.map((item) => item.rate_limit_id);
    const toCreate = incomingRateLimits.filter(
      (item) => !existingIds.includes(item.rate_limit_id),
    );
    const toUpdate = incomingRateLimits.filter((item) =>
      existingIds.includes(item.rate_limit_id),
    );
    const toDeleteIds = existingIds.filter((id) => !incomingIds.includes(id));
    if (toCreate.length > 0) {
      const createData = toCreate.map((item) => ({ ...item, user_id: userId }));
      await UserRateLimit.bulkCreate(createData, { transaction: t });
    }
    for (const item of toUpdate) {
      await UserRateLimit.update(item, {
        where: { user_id: userId, rate_limit_id: item.rate_limit_id },
        transaction: t,
      });
    }
    if (toDeleteIds.length > 0) {
      const user = await User.findByPk(userId);
      allUsers = await getAllHierarchyUsers(user.account);
      await UserRateLimit.destroy({
        where: {
          rate_limit_id: toDeleteIds,
          user_id: {
            [Op.in]: allUsers,
          },
        },
        transaction: t,
      });
    }
    const operateUser = await User.findByPk(userId, {
      include: [{ model: Role, as: "role" }],
    });
    let operatorUserId = req.user.id;
    const userRole = await Role.findOne({
      where: { id: req.user.role_id },
    });
    if (userRole.name !== "developer") {
      if (userRole.name === "sub_account") {
        const userData = await User.findOne({
          where: { account: req.user.creator_account },
        });
        operatorUserId = userData.id;
      }
      const logData = {
        operator_user_id: operatorUserId,
        operated_user_id: operateUser.id,
        action: "modify",
        oldData: {
          rate_limits: oldLimits,
        },
        newData: {
          rate_limits: incomingRateLimits,
          screen_name: screenName,
          role_name: operateUser.role.name,
        },
        ip_location: ipLocation,
        remark: "",
      };

      await createOperationLog(t, logData);
    }
    await t.commit();
    return response(res, 200, true, "User rate limits merged successfully");
  } catch (error) {
    await t.rollback();
    return response(
      res,
      400,
      false,
      error.message || "Failed to save user rate limits",
    );
  }
}

module.exports = {
  getBetRateLimits,
  getUpperUserRateLimits,
  saveUserRateLimits,
  mergeUserRateLimits,
};
