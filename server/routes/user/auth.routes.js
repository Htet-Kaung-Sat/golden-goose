const express = require("express");
const {
  login,
  logout,
  verify,
} = require("../../controllers/user/auth.controller.js");
const authMiddleware = require("../../middleware/auth.middleware.js");
const { loginLimiter } = require("../../middleware/rateLimit.middleware.js");

const router = express.Router();

router.post("/player_login", loginLimiter, login);
router.post("/player_logout", logout);
router.get("/player_verify", authMiddleware, verify);

module.exports = router;
