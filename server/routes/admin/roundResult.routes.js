const express = require("express");
const {
  getRoundResults,
  getRoundResult,
  createRoundResult,
  updateRoundResult,
  deleteRoundResult,
} = require("../../controllers/admin/roundResult.controller.js");

const router = express.Router();

router.get("/", getRoundResults);
router.get("/:id", getRoundResult);
router.post("/", createRoundResult);
router.put("/:id", updateRoundResult);
router.delete("/:id", deleteRoundResult);

module.exports = router;
