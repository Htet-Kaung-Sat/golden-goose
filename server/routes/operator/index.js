const express = require("express");
const { verify: operatorVerify, logout: operatorLogout } = require("../../controllers/operator/auth.controller.js");
const operatorRoutes = require("./operator.routes.js");

const router = express.Router();

router.get("/auth/verify", operatorVerify);
router.post("/auth/logout", operatorLogout);
router.use("/", operatorRoutes);

module.exports = router;
