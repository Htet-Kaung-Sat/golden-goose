const Joi = require("joi");

// Create GameRound Validation
const createGameRoundSchema = Joi.object({
  session_id: Joi.number().integer().required(),
  round_no: Joi.number().integer().required(),
  status: Joi.string()
    .valid("active", "betting", "dealing", "finished")
    .required(),
});

// Update GameRound Validation
const updateGameRoundSchema = Joi.object({
  session_id: Joi.number().integer().optional(),
  round_no: Joi.number().integer().optional(),
  status: Joi.string()
    .valid("active", "betting", "dealing", "finished")
    .optional(),
});

module.exports = {
  createGameRoundSchema,
  updateGameRoundSchema,
};
