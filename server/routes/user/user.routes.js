const express = require("express");
const {
  getResultsByDesk,
  getConfirmedBets,
  createBetResult,
  updateBetResult,
  cancelBetResult,
  updateBetKey,
  updateGameRound,
  getUserBetResults,
  getBetDetailsByDate,
  getTransactions,
  getDesks,
  getCameras,
  getGames,
  getUser,
  getProfile,
  getAnnounce,
  getNiuniuResultsByDesk,
  getResultCardByRound,
  getLastRoundStatus,
  getLastRoundResult,
  changePassword,
} = require("../../controllers/user/user.controller.js");

const router = express.Router();

router.get("/announce", getAnnounce);
router.get("/results_by_desk/:id", getResultsByDesk);
router.get("/confirm_bets/:last_round", getConfirmedBets);
router.post("/bet_results", createBetResult);
router.put("/bet_results", updateBetResult);
router.post("/cancle_bet_results", cancelBetResult);
router.put("/bet_keys", updateBetKey);
router.put("/game_rounds/:id", updateGameRound);
router.get("/user_bet_results", getUserBetResults);
router.get("/user_bet_results/detail", getBetDetailsByDate);
router.get("/user_bet_results/detail/cards", getResultCardByRound);
router.get("/transactions", getTransactions);
router.get("/games", getGames);
router.get("/desks", getDesks);
router.get("/cameras", getCameras);
router.get("/profile", getProfile);
router.get("/users/:id", getUser);
router.get("/niuniu_results/:desk_id", getNiuniuResultsByDesk);
router.get("/last_round_status/:desk_id", getLastRoundStatus);
// [SLOW-NETWORK FIX] Polling fallback endpoint for user panel result delivery
router.get("/last_round_result/:desk_id/:last_round_id", getLastRoundResult);
router.put("/change_password", changePassword);

module.exports = router;
