const Joi = require("joi");

const loginSchema = Joi.object({
  user_id: Joi.number().integer().required(),
  state: Joi.boolean(),
  equipment: Joi.string().max(255),
  browser: Joi.string().max(255),
  ip_address: Joi.string().ip({ version: ["ipv4", "ipv6"] }),
  site: Joi.string().max(255),
  createdAt: Joi.date().optional(),
});

module.exports = {
  loginSchema,
};
