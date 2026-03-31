const express = require("express");
const {
  getBets,
  createBet,
  updateBet,
  getBet,
  deleteBet,
} = require("../../controllers/admin/bet.controller.js");

const router = express.Router();

router.post("/", createBet);
router.get("/", getBets);
router.put("/:id", updateBet);
router.get("/:id", getBet);
router.delete("/:id", deleteBet);
module.exports = router;
