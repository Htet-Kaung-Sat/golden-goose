const Joi = require("joi");

// Create GameSession Validation
const createGameSessionSchema = Joi.object({
  desk_id: Joi.number().integer().required(),
  user_id: Joi.number().integer().required(),
  status: Joi.string().valid("active", "waiting", "finished").required(),
  start_time: Joi.date().optional(),
  end_time: Joi.date().optional(),
});

// Update GameSession Validation
const updateGameSessionSchema = Joi.object({
  desk_id: Joi.number().integer().optional(),
  user_id: Joi.number().integer().optional(),
  status: Joi.string().valid("active", "waiting", "finished").optional(),
  start_time: Joi.date().optional(),
  end_time: Joi.date().optional(),
});

module.exports = {
  createGameSessionSchema,
  updateGameSessionSchema,
};
