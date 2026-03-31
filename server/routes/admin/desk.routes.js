const express = require("express");
const {
  getDesks,
  getDesk,
  createDesk,
  updateDesk,
  deleteDesk,
  getTabletopReports,
} = require("../../controllers/admin/desk.controller.js");

const router = express.Router();
router.get("/", getDesks);
router.get("/:id", getDesk);
router.post("/", createDesk);
router.put("/:id", updateDesk);
router.delete("/:id", deleteDesk);
router.get("/report_management/get_tabletop_report", getTabletopReports);
module.exports = router;
