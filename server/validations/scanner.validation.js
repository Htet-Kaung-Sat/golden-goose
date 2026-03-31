const Joi = require("joi");

// Create Scanner Validation
const createScannerSchema = Joi.object({
  name: Joi.string().required(),
  desk_id: Joi.number().integer().required(),
  serial_number: Joi.string(),
  com_port: Joi.string().required(),
  position: Joi.number().integer().required(),
});

// Update Scanner Validation
const updateScannerSchema = Joi.object({
  name: Joi.string(),
  desk_id: Joi.number().integer(),
  serial_number: Joi.string(),
  com_port: Joi.string(),
  position: Joi.number().integer(),
});

module.exports = {
  createScannerSchema,
  updateScannerSchema,
};
