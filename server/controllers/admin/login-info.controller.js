const { Op } = require("sequelize");
const { LoginInfo, User, Role, sequelize } = require("../../models/index.js");
const { response } = require("../../utils/response.js");
const { loginSchema } = require("../../validations/login-info.validation.js");
const {
  getAllHierarchyUsers,
  getUpperestAgentData,
} = require("../../utils/common.js");

const getLoginInfos = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "user_id",
      "state",
      "equipment",
      "browser",
      "ip_address",
      "site",
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
    if (req.query.targetAccount) {
      let userInclude = (include || []).find((inc) => inc.as === "user");
      if (!userInclude) {
        userInclude = includeMap.user;
        include = [...(include || []), userInclude];
      }
      userInclude.where = {
        account: {
          [Op.like]: `%${req.query.targetAccount}%`,
        },
      };
    }
    if (req.query.ipAddress) {
      whereClause.ip_address = {
        [Op.like]: `%${req.query.ipAddress}%`,
      };
    }
    if (req.query.startDate && req.query.endDate) {
      whereClause.createdAt = {
        [Op.gte]: sequelize.literal(`'${req.query.startDate}'`),
        [Op.lte]: sequelize.literal(`'${req.query.endDate}'`),
      };
    }
    if (req.query.startDate && !req.query.endDate) {
      whereClause.createdAt = {
        [Op.gte]: sequelize.literal(`'${req.query.startDate}'`),
      };
    }
    if (!req.query.startDate && req.query.endDate) {
      whereClause.createdAt = {
        [Op.lte]: sequelize.literal(`'${req.query.endDate}'`),
      };
    }
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
    if (req.query.allHierarchy) {
      let allUsers = await getAllHierarchyUsers(creatorAccount);
      whereClause.user_id = {
        [Op.in]: allUsers,
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
      const loginInfos = await LoginInfo.findAndCountAll(options);
      return response(res, 200, true, "LoginInfos fetched successfully", {
        loginInfos: loginInfos.rows,
        pagination: {
          total: loginInfos.count,
          page,
          limit,
          totalPages: Math.ceil(loginInfos.count / limit),
        },
      });
    } else {
      const loginInfos = await LoginInfo.findAll(options);
      return response(res, 200, true, "LoginInfos fetched successfully", {
        loginInfos,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getLoginInfo = async (req, res) => {
  try {
    const login = await LoginInfo.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "account", "name"],
        },
      ],
    });

    if (!login) return response(res, 404, false, "LoginInfo not found");

    response(res, 200, true, "LoginInfo fetched successfully", { login });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const createLoginInfo = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const session = await LoginInfo.create(value);

    response(res, 201, true, "LoginInfo saved successfully", { session });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getLoginInfos,
  getLoginInfo,
  createLoginInfo,
};
