const express = require("express");
const {
  getBetResults,
  getBetResult,
  createBetResult,
  updateBetResult,
  deleteBetResult,
  getCodeLookUps,
  getSummaryReports,
  getDailyReports,
  getOnlinePlayers,
} = require("../../controllers/admin/bet-result.controller.js");

const router = express.Router();

router.get("/", getBetResults);
router.get("/:id", getBetResult);
router.post("/", createBetResult);
router.put("/:id", updateBetResult);
router.delete("/:id", deleteBetResult);
router.get("/report_mamnagement/code_lookup", getCodeLookUps);
router.get("/report_mamnagement/summary_report", getSummaryReports);
router.get("/report_mamnagement/daily_report", getDailyReports);
router.get("/report_mamnagement/online_players", getOnlinePlayers);
module.exports = router;
