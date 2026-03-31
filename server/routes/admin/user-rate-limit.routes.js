const express = require("express");
const {
  getBetRateLimits,
  getUpperUserRateLimits,
  saveUserRateLimits,
  mergeUserRateLimits,
} = require("../../controllers/admin/user-rate-limit.controller.js");

const router = express.Router();

router.get("/account_information/bet_rate_limits", getBetRateLimits);
router.get("/new_user/upper_user_rate", getUpperUserRateLimits);
router.post("/save", saveUserRateLimits);
router.post("/merge", mergeUserRateLimits);
module.exports = router;
