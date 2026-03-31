const Joi = require("joi");

const createResultSchema = Joi.object({
  game_id: Joi.number().integer().required(),
  key: Joi.string().required(),
  baccarat_type: Joi.string().optional(),
  position: Joi.number().required(),
  name: Joi.string().max(255).optional(),
  ratio: Joi.number().precision(2).optional(),
});

const updateResultSchema = Joi.object({
  game_id: Joi.number().integer().optional(),
  key: Joi.string().optional(),
  baccarat_type: Joi.string().optional(),
  position: Joi.number().required(),
  name: Joi.string().max(255).optional(),
  ratio: Joi.number().precision(2).optional(),
});

module.exports = {
  createResultSchema,
  updateResultSchema,
};
