const express = require("express");
const {
  getLoginInfos,
  getLoginInfo,
  createLoginInfo,
} = require("../../controllers/admin/login-info.controller.js");

const router = express.Router();

router.get("/", getLoginInfos);
router.get("/:id", getLoginInfo);
router.post("/", createLoginInfo);

module.exports = router;
