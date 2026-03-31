const Joi = require("joi");

// Create Camera Validation
const createCameraSchema = Joi.object({
  desk_id: Joi.number().integer().allow(null).optional(),
  camera_no: Joi.string().optional(),
  position: Joi.string().required(),
  url: Joi.string().required(),
  status: Joi.string().required(),
});

// Update Camera Validation
const updateCameraSchema = Joi.object({
  desk_id: Joi.number().integer().allow(null).optional(),
  camera_no: Joi.string().optional(),
  position: Joi.string().required(),
  url: Joi.string().required(),
  status: Joi.string().required(),
});

module.exports = {
  createCameraSchema,
  updateCameraSchema,
};
