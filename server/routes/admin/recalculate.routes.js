const express = require("express");
const {
  recalculateResult,
  recalculateNiuniuResult,
} = require("../../controllers/admin/recalculate.controller.js");

const router = express.Router();
router.post("/recalculate_result", recalculateResult);
router.post("/recalculate_niuniu_result", recalculateNiuniuResult);

module.exports = router;
