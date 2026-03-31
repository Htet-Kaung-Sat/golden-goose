const express = require("express");
const {
  getResults,
  getResult,
  createResult,
  updateResult,
  deleteResult,
  OperateResults,
} = require("../../controllers/admin/result.controller.js");

const router = express.Router();

router.get("/", getResults);
router.get("/:id", getResult);
router.post("/", createResult);
router.put("/:id", updateResult);
router.delete("/:id", deleteResult);
router.post("/operate", OperateResults);

module.exports = router;
