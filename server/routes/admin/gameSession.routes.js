const express = require("express");
const {
  getGameSessions,
  getGameSession,
  createGameSession,
  updateGameSession,
  deleteGameSession,
  getBootReports,
} = require("../../controllers/admin/gameSession.controller.js");

const router = express.Router();

router.get("/", getGameSessions);
router.get("/:id", getGameSession);
router.post("/", createGameSession);
router.put("/:id", updateGameSession);
router.delete("/:id", deleteGameSession);
router.get("/report_management/boot_report", getBootReports);

module.exports = router;
