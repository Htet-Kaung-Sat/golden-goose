const Joi = require("joi");

const createAnnounceItemSchema = Joi.object({
  title: Joi.string().trim().required().max(255),
  content: Joi.string().trim().required(),
  user_id: Joi.number().integer().required(),
  type: Joi.number().integer().min(0).optional(),
});

const updateAnnounceItemSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  title: Joi.string().trim().required().max(255),
  content: Joi.string().trim().required(),
  user_id: Joi.number().integer().required(),
});

const operateAnnouncesSchema = Joi.object({
  creates: Joi.array().items(createAnnounceItemSchema).optional().default([]),
  updates: Joi.array().items(updateAnnounceItemSchema).optional().default([]),
  deletes: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .default([]),
});

module.exports = {
  operateAnnouncesSchema,
  createAnnounceItemSchema,
  updateAnnounceItemSchema,
};
