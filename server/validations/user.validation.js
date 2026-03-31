const Joi = require("joi");

// Create User Validation
const createUserSchema = Joi.object({
  role_id: Joi.number().integer().required(),
  account: Joi.string().trim().min(4).max(255).required(),
  creator_account: Joi.string().trim().min(4).max(255).required(),
  name: Joi.string().trim().min(2).max(255).required(),
  password: Joi.string().trim().min(6).max(255).required(),
  level: Joi.number().optional(),
  login_password: Joi.string().allow("").optional(),
  state: Joi.string()
    .valid("normal", "suspension", "freeze", "online", "offline")
    .optional(),
  bonus_type: Joi.string().optional(),
  bonus_rate: Joi.number().optional(),
  display_bonus: Joi.boolean().optional(),
  share_type: Joi.boolean().optional(),
  share_rate: Joi.number().optional(),
  permission: Joi.string().allow("").optional(),
  day_limit: Joi.number().integer().optional(),
  is_subaccount: Joi.boolean().optional(),
});

// Update User Validation
const updateUserSchema = Joi.object({
  role_id: Joi.number().integer().optional(),
  account: Joi.string().trim().min(4).max(255).optional(),
  creator_account: Joi.string().trim().min(2).max(255).optional(),
  name: Joi.string().trim().min(2).max(255).optional(),
  password: Joi.string().trim().min(6).max(255).optional(),
  oldPassword: Joi.string().trim().min(6).max(255).optional(),
  login_password: Joi.string().allow("").optional(),
  confirm_password: Joi.string().min(6).max(255).optional(),
  state: Joi.string()
    .valid("normal", "suspension", "freeze", "online", "offline")
    .optional(),
  bonus_type: Joi.string().optional(),
  bonus_rate: Joi.number().optional(),
  display_bonus: Joi.boolean().optional(),
  share_type: Joi.boolean().optional(),
  share_rate: Joi.number().optional(),
  permission: Joi.string().allow("").optional(),
  day_limit: Joi.number().integer().optional(),
  is_subaccount: Joi.boolean().optional(),
  ip_location: Joi.string().optional(),
  screen_name: Joi.string().optional(),
  locking: Joi.string().optional(),
  login_flg: Joi.boolean().optional(),
});

const updateBasicInformationSchema = Joi.object({
  account: Joi.string().min(4).max(255).optional(),
  screen_name: Joi.string().optional(),
  ip_location: Joi.string().optional(),
  state: Joi.string()
    .valid("normal", "suspension", "freeze", "online", "offline")
    .optional(),
  event: Joi.string().optional(),
  locking: Joi.string().valid("normal", "locking").optional(),
});

const updateUserBalanceSchema = Joi.object({
  actual_amount: Joi.number().required(),
  amount: Joi.number().required(),
  remark: Joi.string().allow("").optional(),
  status: Joi.string().trim().required(),
  operator_user_id: Joi.number().integer().required(),
  operated_user_id: Joi.number().integer().required(),
  action: Joi.string()
    .trim()
    .valid(
      "points_boost",
      "deposit",
      "modify",
      "login",
      "wash_code",
      "recalculate",
      "cancel",
    )
    .required(),
  ip_location: Joi.string().trim().max(255).required(),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  updateBasicInformationSchema,
  updateUserBalanceSchema,
};
