const {
  sequelize,
  Game,
  RateLimit,
  User,
  OperationLog,
  Role,
} = require("../../models/index.js");
const {
  getAllHierarchyUsers,
  getUpperestAgentData,
} = require("../../utils/common.js");
const { response } = require("../../utils/response.js");
const { Op } = require("sequelize");

const getOperationLog = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const {
      startDate,
      endDate,
      operatorAccount,
      operatedAccount,
      ipLocation,
      selectedAction,
    } = req.query;
    const where = {};
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
    if (operatorAccount) {
      const user = await User.findOne({
        where: {
          account: operatorAccount,
          id: {
            [Op.in]: allUsers,
          },
        },
        include: [{ model: Role, as: "role" }],
      });
      if (!user) {
        return response(res, 403, false, "查无资料");
      }
    }
    if (operatedAccount) {
      const user = await User.findOne({
        where: {
          account: operatedAccount,
          id: {
            [Op.in]: allUsers,
          },
        },
        include: [{ model: Role, as: "role" }],
      });
      if (!user) {
        return response(res, 403, false, "查无资料");
      }
    }
    if (startDate && endDate) {
      where.createdAt = {
        [Op.gte]: sequelize.literal(`'${startDate}'`),
        [Op.lte]: sequelize.literal(`'${endDate}'`),
      };
    }
    if (startDate && !endDate) {
      where.createdAt = {
        [Op.gte]: sequelize.literal(`'${startDate}'`),
      };
    }
    if (!startDate && endDate) {
      where.createdAt = {
        [Op.lte]: sequelize.literal(`'${endDate}'`),
      };
    }
    if (selectedAction) {
      if (selectedAction === "topup") {
        where.action = {
          [Op.in]: ["points_boost", "deposit"],
        };
      } else {
        where.action = selectedAction;
      }
    }
    if (ipLocation) {
      where.ip_location = {
        [Op.like]: `%${ipLocation}%`,
      };
    }
    const operationsLogs = await OperationLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "operator",
          attributes: ["id", "account"],
          where: operatorAccount
            ? { account: operatorAccount }
            : { id: allUsers },
        },
        {
          model: User,
          as: "operatedUser",
          attributes: ["id", "account"],
          where: operatedAccount ? { account: operatedAccount } : undefined,
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });
    return response(res, 200, true, "Operation Log Fetch Successfully.", {
      operationLogs: operationsLogs.rows,
      pagination: {
        total: operationsLogs.count,
        page,
        limit,
        offset,
        totalPages: Math.ceil(operationsLogs.count / limit),
      },
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const createOperationLog = async (t, logData) => {
  try {
    const {
      operator_user_id,
      operated_user_id,
      action,
      ip_location,
      actual_amount,
      amount,
      remark,
      oldData,
      newData,
      topupNo,
    } = logData;
    let description = "";
    let actionInsert = "";
    const users = await User.findAll({ where: { id: operated_user_id } });
    let changes = "";
    if (action === "modify") {
      if (newData.name && oldData.name !== newData.name) {
        changes += `，<br />`;
        changes += `姓名: [${oldData.name}] -> [${newData.name}]`;
      }
      if (newData.password) {
        changes += `，<br />`;
        changes += `密码: [已修改]`;
      }
      if (newData.rate_limits || oldData.rate_limits) {
        const oldLimits = oldData.rate_limits || [];
        const newLimits = newData.rate_limits || [];
        if (newData.role_name === "agent") {
          const oldIds = oldLimits.map((l) => l.rate_limit_id);
          const newIds = newLimits.map((l) => l.rate_limit_id);
          const addedIds = newIds.filter((id) => !oldIds.includes(id));
          const removedIds = oldIds.filter((id) => !newIds.includes(id));
          const formatLimits = async (ids) => {
            if (ids.length === 0) return "";
            const details = await RateLimit.findAll({
              where: { id: ids },
              include: [{ model: Game, as: "game" }],
            });
            const grouped = details.reduce((acc, curr) => {
              const gName = curr.game.name;
              const range = `${curr.min_bet}-${curr.max_bet}`;
              if (!acc[gName]) acc[gName] = [];
              acc[gName].push(range);
              return acc;
            }, {});
            return Object.entries(grouped)
              .map(([name, ranges]) => `${name} => ${ranges.join(", ")}`)
              .join("<br />");
          };
          if (addedIds.length > 0) {
            const addedStr = await formatLimits(addedIds);
            changes += `，<br />`;
            changes += `添加投注区间:<br />${addedStr}`;
          }
          if (removedIds.length > 0) {
            const removedStr = await formatLimits(removedIds);
            changes += `<br />`;
            changes += `削除投注区间:<br />${removedStr}`;
          }
        } else if (newData.role_name === "member") {
          const oldRateLimitIds = (oldData.rate_limits || []).map(
            (l) => l.rate_limit_id,
          );
          const newRateLimitIds = (newData.rate_limits || []).map(
            (l) => l.rate_limit_id,
          );
          const changedIndices = [];
          const idsToFetch = [];
          for (let i = 0; i < newRateLimitIds.length; i++) {
            if (!oldRateLimitIds[i]) {
              changedIndices.push(i);
              if (oldRateLimitIds[i]) idsToFetch.push(oldRateLimitIds[i]);
              if (newRateLimitIds[i]) idsToFetch.push(newRateLimitIds[i]);
            } else if (oldRateLimitIds[i] !== newRateLimitIds[i]) {
              changedIndices.push(i);
              if (oldRateLimitIds[i]) idsToFetch.push(oldRateLimitIds[i]);
              if (newRateLimitIds[i]) idsToFetch.push(newRateLimitIds[i]);
            }
          }
          if (idsToFetch.length > 0) {
            const limitDetails = await RateLimit.findAll({
              where: { id: [...new Set(idsToFetch)] },
              include: [{ model: Game, as: "game" }],
            });
            const detailMap = limitDetails.reduce((acc, item) => {
              acc[item.id] = {
                name: item.game?.name || "未知游戏",
                range: `${item.min_bet}-${item.max_bet}`,
              };
              return acc;
            }, {});
            for (const i of changedIndices) {
              const oldId = oldRateLimitIds[i];
              const newId = newRateLimitIds[i];
              const oldInfo = detailMap[oldId];
              const newInfo = detailMap[newId];
              const gameName =
                newInfo?.name || oldInfo?.name || `游戏 (Index ${i})`;
              const oldRange = oldInfo ? oldInfo.range : "未设置";
              const newRange = newInfo ? newInfo.range : "未设置";
              changes += `，<br />${gameName}: [${oldRange}] -> [${newRange}]`;
            }
          }
        }
      }
    } else if (action === "locking") {
      if (newData.locking === "locking") {
        changes += `，<br />`;
        changes += `锁定操作`;
      } else {
        changes += `，<br />`;
        changes += `解锁操作`;
      }
    } else if (action === "state") {
      const oldState =
        oldData.state === "freeze"
          ? "冻结"
          : oldData.state === "suspension"
            ? "停权"
            : "正常";
      const newState =
        newData.state === "freeze"
          ? "冻结"
          : newData.state === "suspension"
            ? "停权"
            : "正常";
      if (oldState !== newState) {
        changes += `，<br />`;
        changes += `状态: [${oldState}] -> [${newState}]`;
      }
      if (newData.locking === "locking") {
        if (oldData.locking !== newData.locking) {
          changes += `，<br />`;
          changes += `锁定操作`;
        }
      } else {
        if (oldData.locking !== newData.locking) {
          changes += `，<br />`;
          changes += `解锁操作`;
        }
      }
    } else if (action === "new_user") {
      const { user, rate_limits } = newData;
      changes += `上级代理: [${user.creator_account}]，帐号: [${user.account}]，<br />`;
      changes += `真实姓名: [${user.name}]，身分: [${user.role.chinese_name}]，<br />`;
      changes += `洗码设置: [${user.bonus_type === "both" ? "双边洗码" : "单边洗码"}]，洗码值: [${parseFloat(user.bonus_rate)}%]，<br />`;
      if (user.role.name === "agent") {
        changes += `上下分类型: [${user.share_type ? "比例上分" : "按实上分"}]，占成: [${user.share_rate}%]，<br />`;
      } else if (user.role.name === "member") {
        changes += `查看洗码: [${user.display_bonus ? "是" : "否"}]，<br />`;
      }
      if (rate_limits && rate_limits.length > 0) {
        changes += `投注区间:<br />`;
        const limitDetails = await RateLimit.findAll({
          where: { id: rate_limits.map((l) => l.rate_limit_id) },
          include: [{ model: Game, as: "game" }],
        });
        const grouped = limitDetails.reduce((acc, curr) => {
          const gName = curr.game?.name;
          const range = `${curr.min_bet}-${curr.max_bet}`;
          if (!acc[gName]) acc[gName] = [];
          acc[gName].push(range);
          return acc;
        }, {});
        const limitStr = Object.entries(grouped)
          .map(([name, ranges]) => `${name}: ${ranges.join(", ")}`)
          .join("<br />");
        changes += limitStr;
      }
    } else if (action === "info_update") {
      if (newData.name && oldData.name !== newData.name) {
        changes += `，<br />`;
        changes += `姓名: [${oldData.name}] -> [${newData.name}]`;
      }
      if (newData.password) {
        changes += `，<br />`;
        changes += `密码: [已修改]`;
      }
      const oldState =
        oldData.state === "freeze"
          ? "冻结"
          : oldData.state === "suspension"
            ? "停权"
            : "正常";
      const newState =
        newData.state === "freeze"
          ? "冻结"
          : newData.state === "suspension"
            ? "停权"
            : "正常";
      if (oldState !== newState) {
        changes += `，<br />`;
        changes += `状态: [${oldState}] -> [${newState}]`;
      }
      if (newData.locking === "locking") {
        if (oldData.locking !== newData.locking) {
          changes += `，<br />`;
          changes += `锁定操作`;
        }
      } else {
        if (oldData.locking !== newData.locking) {
          changes += `，<br />`;
          changes += `解锁操作`;
        }
      }
    }
    let remarkValue = "";
    if (remark) {
      remarkValue = "备注: " + remark;
    }
    const descriptions = {
      points_boost:
        "对玩家[" +
        users[0].account +
        "]执行了[上分]操作，<br />充值金额[" +
        actual_amount +
        "]，<br />分数为[" +
        amount +
        "]，<br />操作后余额为[" +
        (Number(users[0].balance) + Number(amount)) +
        "] <br />" +
        remarkValue,
      deposit:
        "对玩家[" +
        users[0].account +
        "]执行了[下分]操作，<br />充值金额[" +
        actual_amount +
        "]，<br />分数为[" +
        amount +
        "]，<br />操作后余额为[" +
        (Number(users[0].balance) - Number(amount)) +
        "] <br /> 备注: " +
        remark,
      login: users[0].account + " 登录操作",
      modify:
        "对玩家[" +
        users[0].account +
        "]执行了[修改人员基本资料]操作" +
        changes,
      new_user:
        "对玩家[" +
        users[0].account +
        "]执行了[添加用户]操作，<br />" +
        changes,
      info_update:
        "对玩家[" +
        users[0].account +
        "]执行了[修改人员基本资料]操作." +
        changes,
    };
    switch (action) {
      case "points_boost":
        actionInsert = "代理手动上分";
        description = descriptions.points_boost;
        break;
      case "deposit":
        actionInsert = "代理手动下分";
        description = descriptions.deposit;
        break;
      case "modify":
        actionInsert = newData.screen_name;
        description = descriptions.modify;
        break;
      case "info_update":
        actionInsert = newData.screen_name;
        description = descriptions.info_update;
        break;
      case "locking":
        actionInsert = newData.screen_name;
        description = descriptions.modify;
        break;
      case "state":
        actionInsert = newData.screen_name;
        description = descriptions.modify;
        break;
      case "new_user":
        actionInsert = newData.screen_name;
        description = descriptions.new_user;
        break;
      case "login":
        actionInsert = "登录";
        description = descriptions.login;
        break;
      default:
        break;
    }
    const value = {
      operator_user_id,
      action,
      action_display: actionInsert,
      operated_user_id,
      description,
      operation_id: topupNo ? topupNo : null,
      ip_location,
      remark,
    };
    if (
      value.action === "locking" ||
      value.action === "state" ||
      value.action === "new_user" ||
      value.action === "info_update"
    ) {
      value.action = "modify";
    }
    await OperationLog.create(value, { transaction: t });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

module.exports = {
  getOperationLog,
  createOperationLog,
};
