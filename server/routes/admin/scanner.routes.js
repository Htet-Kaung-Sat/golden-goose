const express = require("express");
const {
  getScanners,
  createScanner,
  updateScanner,
  getScanner,
  deleteScanner,
} = require("../../controllers/admin/scanner.controller.js");

const router = express.Router();

router.post("/", createScanner);
router.get("/", getScanners);
router.put("/:id", updateScanner);
router.get("/:id", getScanner);
router.delete("/:id", deleteScanner);

module.exports = router;
