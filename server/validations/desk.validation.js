const Joi = require("joi");

// Create Desk Validation
const createDeskSchema = Joi.object({
  baccarat_type: Joi.string().valid("N", "G", "B", null),
  game_id: Joi.number().integer().required(),
  name: Joi.string().trim().min(2).max(100).required(),
  desk_no: Joi.number().integer().required(),
  position: Joi.number().integer().required(),
});

// Update Desk Validation
const updateDeskSchema = Joi.object({
  baccarat_type: Joi.string().valid("N", "G", "B", null),
  game_id: Joi.number().integer().required(),
  name: Joi.string().trim().min(2).max(100).required(),
  desk_no: Joi.number().integer().required(),
  position: Joi.number().integer().required(),
});

module.exports = {
  createDeskSchema,
  updateDeskSchema,
};
