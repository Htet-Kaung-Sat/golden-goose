const express = require("express");
const {
  getGameRounds,
  getGameRound,
  createGameRound,
  updateGameRound,
  deleteGameRound,
} = require("../../controllers/admin/gameRound.controller.js");

const router = express.Router();

router.get("/", getGameRounds);
router.get("/:id", getGameRound);
router.post("/", createGameRound);
router.put("/:id", updateGameRound);
router.delete("/:id", deleteGameRound);

module.exports = router;
