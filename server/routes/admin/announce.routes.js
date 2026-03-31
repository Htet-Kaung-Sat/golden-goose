const express = require("express");
const {
  getAnnounces,
  operateAnnounces,
  memberOverview,
} = require("../../controllers/admin/announce.controller.js");

const router = express.Router();

router.get("/", getAnnounces);
router.post("/operate", operateAnnounces);
router.get("/member_overview", memberOverview);

module.exports = router;
