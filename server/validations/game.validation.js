const Joi = require("joi");

// Create Game Validation
const createGameSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  type: Joi.string().required(),
});

// Update Game Validation
const updateGameSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  type: Joi.string().required(),
});

module.exports = {
  createGameSchema,
  updateGameSchema,
};
