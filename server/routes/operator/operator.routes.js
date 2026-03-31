const express = require("express");
const {
  createResult,
  getGameInfos,
  createNiuniuResult,
  finishGameSession,
  invalidGame,
  getDesk,
  confirmAccount,
  updateGameRound,
} = require("../../controllers/operator/operator.controller.js");

const router = express.Router();

router.get("/desks/:id", getDesk);
router.get("/game_infos/:id", getGameInfos);
router.post("/results", createResult);
router.post("/niuniu_results", createNiuniuResult);
router.put("/game_rounds/:id", updateGameRound);
router.post("/finish_game_session/:desk_id", finishGameSession);
router.post("/invalid_game", invalidGame);
router.post("/confirm_account", confirmAccount);

module.exports = router;
