const express = require("express");
const {
  getGames,
  createGame,
  updateGame,
  getGame,
  deleteGame,
} = require("../../controllers/admin/game.controller.js");

const router = express.Router();

router.post("/", createGame);
router.get("/", getGames);
router.put("/:id", updateGame);
router.get("/:id", getGame);
router.delete("/:id", deleteGame);
module.exports = router;
