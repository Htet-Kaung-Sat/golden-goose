const express = require("express");
const { login } = require("../../controllers/operator/auth.controller.js");
const { loginLimiter } = require("../../middleware/rateLimit.middleware.js");

const router = express.Router();

router.post("/operator_login", loginLimiter, login);

module.exports = router;
