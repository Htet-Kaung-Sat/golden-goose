const {
  sequelize,
  User,
  Role,
  UserRateLimit,
  RateLimit,
  Transaction,
} = require("../../models");
const { response } = require("../../utils/response.js");
const { Op, INTEGER } = require("sequelize");
const bcrypt = require("bcryptjs");
const {
  createUserSchema,
  updateUserSchema,
  updateBasicInformationSchema,
  updateUserBalanceSchema,
} = require("../../validations/user.validation.js");
const {
  getAllHierarchyAgents,
  getTotalBalance,
  getAllHierarchyUsers,
  getAllHierarchyMembers,
  getUpperestAgentData,
} = require("../../utils/common.js");
const { createOperationLog } = require("./operation-log.controller.js");

const getUsers = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "role_id",
      "account",
      "creator_account",
      "name",
      "password",
      "level",
      "state",
      "locking",
      "balance",
      "bonus_type",
      "bonus_rate",
      "display_bonus",
      "share_type",
      "share_rate",
      "day_limit",
      "token_version",
      "login_flg",
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
      role: { model: Role, as: "role" },
      userRateLimits: { model: UserRateLimit, as: "userRateLimits" },
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
    const userRole = await Role.findOne({
      where: { id: req.user.role_id },
    });
    let upperestUser;
    if (userRole.name === "developer" || req.query.upperestAgent) {
      upperestUser = await getUpperestAgentData();
    }
    const creatorAccount =
      userRole.name === "developer"
        ? upperestUser.account
        : userRole.name === "sub_account"
          ? req.user.creator_account
          : req.user.account;
    const whereClause = {};
    if (req.query.id) {
      whereClause.id = req.query.id;
    }
    if (req.query.creator_account) {
      whereClause.creator_account = req.query.creator_account;
    }
    if (req.query.user_search && req.query.creator_account) {
      let allUsers = await getAllHierarchyUsers(creatorAccount);
      const user = await User.findOne({
        where: {
          account: req.query.creator_account,
          id: {
            [Op.in]: allUsers,
          },
        },
      });
      if (!user) {
        return response(res, 403, false, "查无资料");
      }
    }
    if (req.query.hierarchyMembers === "true") {
      let memberIds = [];
      if (req.query.account && req.query.account !== "") {
        const searchUser = await User.findOne({
          where: { account: req.query.account },
        });
        if (!searchUser) {
          return response(res, 403, false, "查无资料");
        }
        memberIds.push(searchUser.id);
      } else {
        const loginAccount = req.query.login_account;
        memberIds = await getAllHierarchyMembers(loginAccount);
      }
      whereClause.id = {
        [Op.in]: memberIds.length ? memberIds : [-1],
      };
    }
    if (req.query.account) {
      whereClause.account = req.query.account;
    }
    if (req.query.user_search && req.query.account) {
      let allUsers = await getAllHierarchyUsers(creatorAccount);
      const user = await User.findOne({
        where: {
          account: req.query.account,
          id: {
            [Op.in]: allUsers,
          },
        },
      });
      if (!user) {
        return response(res, 403, false, "查无资料");
      }
    }
    if (req.query.allHierarchy) {
      let allUsers = await getAllHierarchyUsers(creatorAccount);
      whereClause.id = {
        [Op.in]: allUsers,
      };
    }
    if (req.query.accounts) {
      let accounts = req.query.accounts;
      if (accounts && !Array.isArray(accounts)) {
        accounts = accounts.split(", ");
      }
      whereClause.account = {
        [Op.in]: accounts,
      };
    }
    if (req.query.name && req.query.nameAccount) {
      if (req.query.nameAccount === "account") {
        let allUsers = await getAllHierarchyUsers(creatorAccount);
        const user = await User.findOne({
          where: {
            account: req.query.name,
            id: {
              [Op.in]: allUsers,
            },
          },
        });
        if (!user) {
          return response(res, 403, false, "查无资料");
        } else {
          whereClause.account = req.query.name;
        }
        whereClause.account = req.query.name;
      } else if (req.query.nameAccount === "name") {
        whereClause.name = req.query.name;
      }
    }
    if (req.query.status) {
      whereClause.status = req.query.status;
    }
    if (req.query.state) {
      whereClause.state = req.query.state;
    }
    if (req.query.role) {
      whereClause.role_id = req.query.role;
    }
    if (req.query.loginFlg) {
      whereClause.login_flg = req.query.loginFlg;
    }
    const options = { attributes: { exclude: ["password"] } };
    if (Object.keys(whereClause).length) options.where = whereClause;
    if (usePagination) {
      options.limit = limit;
      options.offset = (page - 1) * limit;
    }
    if (order) options.order = order;
    if (include) options.include = include;
    if (usePagination && include) options.distinct = true;
    if (req.query.role_name) {
      const roleNames = req.query.role_name.split(/\s*,\s*/).filter(Boolean);
      if (roleNames.length > 0) {
        options.include = options.include || [];
        options.include.push({
          model: Role,
          as: "role",
          where: {
            name: { [Op.in]: roleNames },
          },
        });
        options.distinct = true;
      }
    }
    let users;
    let count = 0;
    if (usePagination) {
      const result = await User.findAndCountAll(options);
      users = result.rows;
      count = result.count;
    } else {
      users = await User.findAll(options);
    }
    if (req.query.totalBalance && users.length > 0) {
      const balancePromises = users.map(async (user) => {
        const userPlain = user.get({ plain: true });
        userPlain.total_balance = await getTotalBalance(userPlain.account);
        return userPlain;
      });
      users = await Promise.all(balancePromises);
    }
    if (req.query.upperestAgent && users.length > 0) {
      const upperestAgent = users.map(async (user) => {
        const userPlain = user.get({ plain: true });
        userPlain.upper_agent = upperestUser.account;
        return userPlain;
      });
      users = await Promise.all(upperestAgent);
    }
    if (usePagination) {
      return response(res, 200, true, "Users fetched successfully", {
        users: users,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } else {
      return response(res, 200, true, "Users fetched successfully", {
        users,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Role, as: "role" },
        {
          model: UserRateLimit,
          as: "userRateLimits",
          include: [
            {
              model: RateLimit,
              as: "rateLimit",
            },
          ],
        },
      ],
    });

    if (!user) return response(res, 404, false, "User not found");

    response(res, 200, true, "User fetched successfully", { user });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const exists = await User.findOne({ where: { account: value.account } });
    if (exists) return response(res, 400, false, "Account already exists");

    const user = await User.create(value);
    response(res, 201, true, "User created successfully", { user });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const t = await sequelize.transaction();
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return response(res, 400, false, error.details[0].message);
    }
    const user = await User.findByPk(req.params.id);
    if (!user) {
      await t.rollback();
      return response(res, 404, false, "User not found");
    }
    let oldData = {};
    if (value.screen_name) {
      oldData = {
        name: user.name,
        passwordChanged: !!value.password,
      };
    }
    if (req.body.is_subaccount) {
      const loginUser = await User.findByPk(req.user.id);
      const isMatch = await bcrypt.compare(
        req.body.login_password,
        loginUser.password,
      );
      if (!isMatch) {
        await t.rollback();
        return response(res, 401, false, "管理员密码与旧管理员密码不相符");
      }
    } else if (req.body.oldPassword) {
      const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
      if (!isMatch) {
        await t.rollback();
        return response(res, 401, false, "管理员密码与旧管理员密码不相符");
      }
    }
    await user.update(value, { transaction: t });
    if (value.screen_name) {
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
          operated_user_id: user.id,
          action: "modify",
          ip_location: value.ip_location,
          oldData: oldData,
          newData: value,
          remark: "",
        };
        const logResult = await createOperationLog(t, logData);
        if (!logResult.success) {
          await t.rollback();
          return response(res, 500, false, "Failed to create log");
        }
      }
    }
    await t.commit();
    response(res, 200, true, "User updated successfully", { user });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateInfo = async (req, res) => {
  try {
    const t = await sequelize.transaction();
    let oldData = {};
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return response(res, 400, false, error.details[0].message);
    }
    const user = await User.findByPk(req.params.id);
    oldData = {
      name: user.name,
      passwordChanged: !!value.password,
      state: user.state,
      locking: user.locking,
    };
    if (!user || !value.screen_name) {
      await t.rollback();
      return response(res, 404, false, "User not found");
    }
    const isMatch = await bcrypt.compare(req.body.oldPassword, user.password);
    if (!isMatch) {
      await t.rollback();
      return response(res, 401, false, "密码与旧密码不相符");
    }
    const updateResult = await user.update(value, { transaction: t });
    if (!updateResult) {
      await t.rollback();
      return response(res, 500, false, "Failed to update user info");
    }
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
        operated_user_id: user.id,
        action: "info_update",
        ip_location: value.ip_location,
        oldData: oldData,
        newData: value,
        remark: "",
      };
      const logResult = await createOperationLog(t, logData);
      if (!logResult.success) {
        await t.rollback();
        return response(res, 500, false, "Failed to create log");
      }
    }
    await t.commit();
    response(res, 200, true, "User Info updated successfully", { user });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) return response(res, 404, false, "User not found");

    await user.destroy();

    response(res, 200, true, "User deleted successfully");
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const getAgentTrees = async (req, res) => {
  try {
    const userRole = await Role.findOne({
      where: { id: req.user.role_id },
    });
    let upperestUser;
    if (userRole.name === "developer") {
      upperestUser = await getUpperestAgentData();
    }
    const loginAccount =
      userRole.name === "developer"
        ? upperestUser.account
        : userRole.name === "sub_account"
          ? req.user.creator_account
          : req.user.account;
    const account = req.query.account;
    let replacements = {};
    replacements.loginAccount = loginAccount;
    replacements.account = account;
    const [users] = await sequelize.query(
      `WITH RECURSIVE ancestors AS ( 
        SELECT
          id
          , account
          , creator_account
          , role_id 
        FROM
          Users 
        WHERE
          TRIM(account) = TRIM(:account) 
        UNION ALL 
        SELECT
          p.id
          , p.account
          , p.creator_account
          , p.role_id 
        FROM
          Users p 
          JOIN ancestors a 
            ON TRIM(a.creator_account) = TRIM(p.account) 
        WHERE
          TRIM(a.account) != :loginAccount
      ) 
      , children AS ( 
        SELECT
          id
          , account
          , creator_account
          , role_id 
        FROM
          Users 
        WHERE
          TRIM(creator_account) = TRIM(:account) 
          AND role_id = (SELECT id FROM Roles WHERE name = 'agent') 
      ) 
      SELECT DISTINCT
        id
        , account
        , creator_account
        , role_id 
      FROM
        ancestors 
      UNION 
      SELECT DISTINCT
        id
        , account
        , creator_account
        , role_id 
      FROM
        children 
      ORDER BY
        id`,
      { replacements },
    );
    response(res, 200, true, "Agent Tree fetched successfully", { users });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const checkExistOrNotAgents = async (req, res) => {
  try {
    const userRole = await Role.findOne({
      where: { id: req.user.role_id },
    });
    let upperestUser;
    if (userRole.name === "developer") {
      upperestUser = await getUpperestAgentData();
    }
    const loginAccount =
      userRole.name === "developer"
        ? upperestUser.account
        : userRole.name === "sub_account"
          ? req.user.creator_account
          : req.user.account;
    const account = req.query.account;
    let replacements = {};
    const agents = await getAllHierarchyAgents(loginAccount);
    replacements.agents = agents;
    replacements.account = account;
    if (agents.length <= 0) {
      return response(
        res,
        200,
        true,
        "Check Agent Tree fetched successfully",
        [],
      );
    }
    const [users] = await sequelize.query(
      ` SELECT
          id
          , account
          , creator_account
          , role_id 
        FROM
          Users 
        WHERE
          account = :account
          AND id in(:agents)`,
      { replacements },
    );
    response(res, 200, true, "Agent Tree fetched successfully", { users });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const userLockUnlock = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = updateBasicInformationSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return response(res, 400, false, error.details[0].message);
    }
    const { account, screen_name, ip_location, state, event, locking } = value;
    const targetRoles = await Role.findAll({
      where: { name: ["member", "agent"] },
      attributes: ["id"],
    });
    const roleIds = targetRoles.map((r) => r.id);
    const userOperate = await User.findOne({
      where: { account: account },
    });
    if (!userOperate) {
      await t.rollback();
      return response(res, 404, false, "User not found");
    }
    let updateData = {};
    let allUsers = [];
    if (event === "locking") {
      updateData = { locking: locking };
      allUsers = await getAllHierarchyUsers(account, true);
    } else if (event === "state") {
      updateData = { state: state, locking: locking };
      allUsers = await getAllHierarchyUsers(account);
    } else {
      await t.rollback();
      return response(
        res,
        400,
        false,
        "Invalid state action. Use 'lock' or 'unlock'.",
      );
    }
    const [updatedCount] = await User.update(updateData, {
      where: {
        id: allUsers,
        role_id: roleIds,
      },
      transaction: t,
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
        operated_user_id: userOperate.id,
        action: event,
        newData: { screen_name: screen_name, state: state, locking: locking },
        oldData: userOperate,
        ip_location: ip_location,
        remark: "",
      };
      const logResult = await createOperationLog(t, logData);
      if (!logResult.success) {
        await t.rollback();
        return response(res, 500, false, "Failed to create log");
      }
    }
    await t.commit();
    response(res, 200, true, "Users locking/Unlock updated successfully", {
      updatedCount,
    });
  } catch (error) {
    response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateUserBalance = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value } = updateUserBalanceSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return response(res, 400, false, error.details[0].message);
    }
    const {
      actual_amount,
      amount,
      status,
      remark,
      operator_user_id,
      operated_user_id,
      action,
      ip_location,
    } = value;
    const numericAmount = parseInt(amount);
    const users = await User.findAll({
      where: {
        id: { [Op.in]: [operator_user_id, operated_user_id] },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (users.length !== 2) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Child or Parent not found" });
    }
    const lowerUser = users.find((u) => u.id === operated_user_id);
    const upperUser = users.find((u) => u.id === operator_user_id);
    if (!lowerUser || !upperUser) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Child or Parent not found" });
    }
    const upperBefore = upperUser.balance;
    const lowerBefore = lowerUser.balance;
    let upperType, lowerType;
    if (status === "1") {
      if (upperUser.balance < numericAmount) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `${upperUser.account}金额不得大${upperUser.balance}`,
        });
      }
      lowerUser.balance += numericAmount;
      upperUser.balance -= numericAmount;
      upperType = "withdraw";
      lowerType = "topup";
    } else if (status === "2") {
      if (lowerUser.balance < numericAmount) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `${lowerUser.account}金额不得大${lowerUser.balance}`,
        });
      }
      lowerUser.balance -= numericAmount;
      upperUser.balance += numericAmount;
      upperType = "topup";
      lowerType = "withdraw";
    } else {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    await lowerUser.save({ transaction: t });
    await upperUser.save({ transaction: t });
    const lastTopup = await Transaction.findOne({
      order: [["topup_no", "DESC"]],
    });
    let topupNo = lastTopup?.topup_no ? parseInt(lastTopup.topup_no) + 1 : 1;
    await Transaction.bulkCreate(
      [
        {
          user_id: upperUser.id,
          transaction_type: upperType,
          topup_no: topupNo,
          amount: numericAmount,
          before_amount: upperBefore,
          after_amount: upperUser.balance,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          user_id: lowerUser.id,
          transaction_type: lowerType,
          topup_no: topupNo,
          amount: numericAmount,
          before_amount: lowerBefore,
          after_amount: lowerUser.balance,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      { transaction: t },
    );
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
        action,
        operated_user_id,
        ip_location,
        actual_amount: parseInt(actual_amount),
        amount: parseInt(amount),
        remark,
        topupNo,
      };
      const result = await createOperationLog(t, logData);
      if (!result.success) {
        await t.rollback();
        return response(res, 500, false, "Failed to create operation log");
      }
    }
    await t.commit();
    response(res, 200, true, "Balance Update Sucessfully.", { users });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const OperateUsers = async (req, res) => {
  const t = await sequelize.transaction();
  const saltRounds = 10;
  try {
    if (req.body.creates?.length > 0) {
      const insertData = await Promise.all(
        req.body.creates.map(async (item) => {
          let hashedPassword = undefined;
          if (item.password && item.password != "") {
            hashedPassword = await bcrypt.hash(item.password, saltRounds);
          }
          return {
            role_id: item.role_id,
            account: item.account,
            name: item.name,
            ...(hashedPassword && { password: hashedPassword }),
          };
        }),
      );
      await User.bulkCreate(insertData, { transaction: t });
    }
    if (req.body.updates?.length > 0) {
      for (const item of req.body.updates) {
        const updateFields = {
          role_id: item.role_id,
          account: item.account,
          name: item.name,
        };
        if (item.password && item.password != "") {
          updateFields.password = await bcrypt.hash(item.password, saltRounds);
        }
        await User.update(updateFields, {
          where: { id: item.id },
          transaction: t,
        });
      }
    }
    if (req.body.deletes?.length > 0) {
      await User.destroy({
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

/**
 * [PERFORMANCE FIX] Dedicated balance endpoint for admin.
 * Computes totalBalance (expensive recursive CTE) only when the admin dashboard needs it,
 * not on every API request. Called by LoadingContext when on admin pages.
 */
const getBalanceForCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    const roleName = user?.role?.name;
    const allowedRoles = ["agent", "sub_account", "developer"];
    if (!roleName || !allowedRoles.includes(roleName)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    let balance = 0;
    let permission = "";
    let account = null;
    if (roleName === "agent") {
      balance = user.balance || 0;
      permission = user.permission || "";
      account = user.account;
    } else if (roleName === "sub_account") {
      const adminUser = await User.findOne({
        where: { account: user.creator_account },
      });
      if (!adminUser) {
        return res.status(404).json({ error: "Admin user not found" });
      }
      balance = adminUser.balance || 0;
      permission = user.permission || "";
      account = adminUser.account;
    } else if (roleName === "developer") {
      const upperestAgent = await getUpperestAgentData();
      if (!upperestAgent) {
        return response(res, 500, false, "Developer data fetch failed");
      }
      balance = upperestAgent.balance || 0;
      permission = upperestAgent.permission || "";
      account = upperestAgent.account;
    }
    const totalBalance = await getTotalBalance(account);
    return res.json({
      balance: String(balance),
      totalBalance: String(totalBalance ?? 0),
      permission,
    });
  } catch (error) {
    console.error("getBalanceForCurrentUser error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  updateInfo,
  deleteUser,
  getAgentTrees,
  checkExistOrNotAgents,
  userLockUnlock,
  updateUserBalance,
  OperateUsers,
  getBalanceForCurrentUser,
};
