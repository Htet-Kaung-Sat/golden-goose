const Joi = require("joi");

// Create Role Validation
const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  chinese_name: Joi.string().required(),
});

// Update Role Validation
const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  chinese_name: Joi.string().optional(),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
};
