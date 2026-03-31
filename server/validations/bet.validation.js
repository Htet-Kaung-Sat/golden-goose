const Joi = require("joi");

// Create Bet Validation
const createBetSchema = Joi.object({
    round_id: Joi.number().integer().required(),
    user_id: Joi.number().integer().required(),
});

// Update Bet Validation
const updateBetSchema = Joi.object({
    round_id: Joi.number().integer().required(),
    user_id: Joi.number().integer().required(),
});

module.exports = {
  createBetSchema,
  updateBetSchema,
};
