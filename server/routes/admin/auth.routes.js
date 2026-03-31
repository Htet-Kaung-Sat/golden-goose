const express = require("express");
const { login } = require("../../controllers/admin/auth.controller.js");
const { loginLimiter } = require("../../middleware/rateLimit.middleware.js");

const router = express.Router();

router.post("/login", loginLimiter, login);

module.exports = router;
