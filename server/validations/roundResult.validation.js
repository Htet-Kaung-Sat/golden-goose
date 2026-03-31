const Joi = require("joi");

// Create RoundResult Validation
const createRoundResultSchema = Joi.object({
  result_id: Joi.number().integer().required(),
  round_id: Joi.number().integer().required(),
});

// Update RoundResult Validation
const updateRoundResultSchema = Joi.object({
    result_id: Joi.number().integer().required(),
    round_id: Joi.number().integer().required(),
});

module.exports = {
  createRoundResultSchema,
  updateRoundResultSchema,
};
