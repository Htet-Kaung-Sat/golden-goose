const Joi = require("joi");

// Create betResult Validation
const createBetResultSchema = Joi.object({
  result_id: Joi.number().integer().required(),
  bet_id: Joi.number().integer().required(),
  amount: Joi.number().optional(),
  isWin: Joi.boolean(),
  isBetted: Joi.boolean(),
  image: Joi.string().required(),
});

// Update betResult Validation
const updateBetResultSchema = Joi.object({
  result_id: Joi.number().integer().required(),
  bet_id: Joi.number().integer().required(),
  amount: Joi.number().optional(),
  isWin: Joi.boolean(),
  isBetted: Joi.boolean(),
  image: Joi.string(),
});

module.exports = {
  createBetResultSchema,
  updateBetResultSchema,
};
