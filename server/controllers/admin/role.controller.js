const { Role } = require("../../models");
const { response } = require("../../utils/response.js");
const {
  createRoleSchema,
  updateRoleSchema,
} = require("../../validations/role.validation.js");

const { Op } = require("sequelize");

const getRoles = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const usePagination = Number.isInteger(page) && Number.isInteger(limit);
    const rawOrder = req.query.order;
    const allowedSortFields = [
      "id",
      "name",
      "chinese_name",
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
    let roleNames = req.query.roleNames;
    if (roleNames && !Array.isArray(roleNames)) {
      roleNames = roleNames.split(/\s*,\s*/).filter(Boolean);
    }
    let whereClause = {};
    if (roleNames && roleNames.length > 0) {
      whereClause.name = {
        [Op.in]: roleNames,
      };
    }
    const options = {};
    if (Object.keys(whereClause).length) options.where = whereClause;
    if (usePagination) {
      options.limit = limit;
      options.offset = (page - 1) * limit;
    }
    if (order) options.order = order;
    if (usePagination && include) options.distinct = true;
    if (usePagination) {
      const roles = await Role.findAndCountAll(options);
      return response(res, 200, true, "Roles fetched successfully", {
        roles: roles.rows,
        pagination: {
          total: roles.count,
          page,
          limit,
          totalPages: Math.ceil(roles.count / limit),
        },
      });
    } else {
      const roles = await Role.findAll(options);
      return response(res, 200, true, "Roles fetched successfully", {
        roles,
      });
    }
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const getRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) return response(res, 404, false, "Role not found");

    response(res, 200, true, "Role fetched successfully", { role });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const createRole = async (req, res) => {
  try {
    const { error, value } = createRoleSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const exists = await Role.findOne({ where: { name: value.name } });
    if (exists) return response(res, 400, false, "Role already exists");

    const role = await Role.create(value);
    response(res, 201, true, "Role created successfully", { role });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { error, value } = updateRoleSchema.validate(req.body);
    if (error) return response(res, 400, false, error.details[0].message);

    const role = await Role.findByPk(req.params.id);
    if (!role) return response(res, 404, false, "Role not found");

    await role.update(value);
    response(res, 200, true, "Role updated successfully", { role });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) return response(res, 404, false, "Role not found");

    await role.destroy();

    response(res, 200, true, "Role deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

module.exports = {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
};
