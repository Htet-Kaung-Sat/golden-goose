const express = require("express");
const {
  getRateLimits,
  OperateRateLimits,
} = require("../../controllers/admin/rate-limit.controller.js");

const router = express.Router();

router.get("/", getRateLimits);
router.post("/operate", OperateRateLimits);

module.exports = router;
