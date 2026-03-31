const express = require("express");
const { verify: adminVerify } = require("../../controllers/admin/auth.controller.js");
const announceRoutes = require("./announce.routes.js");
const roleRoutes = require("./role.routes.js");
const userRoutes = require("./user.routes.js");
const deskRoutes = require("./desk.routes.js");
const loginInfoRoutes = require("./login-info.routes.js");
const resultRoutes = require("./result.routes.js");
const gameRoutes = require("./game.routes.js");
const gameSessionRoutes = require("./gameSession.routes.js");
const gameRoundRoutes = require("./gameRound.routes.js");
const betRoutes = require("./bet.routes.js");
const betResultRoutes = require("./bet-result.routes.js");
const rateLimitRoutes = require("./rate-limit.routes.js");
const roundResultRoutes = require("./roundResult.routes.js");
const userRateLimitRoutes = require("./user-rate-limit.routes.js");
const operationLogRoutes = require("./operation-log.routes.js");
const recalculateRoutes = require("./recalculate.routes.js");
const scannerRoutes = require("./scanner.routes.js");
const cameraRoutes = require("./camera.routes.js");

const router = express.Router();

// [SECURITY FIX] Lightweight verify endpoint for admin layout; protected by authMiddleware at /api/admin mount
router.get("/auth/verify", adminVerify);
router.use("/announce", announceRoutes);
router.use("/roles", roleRoutes);
router.use("/users", userRoutes);
router.use("/desks", deskRoutes);
router.use("/login_infos", loginInfoRoutes);
router.use("/results", resultRoutes);
router.use("/games", gameRoutes);
router.use("/game_sessions", gameSessionRoutes);
router.use("/game_rounds", gameRoundRoutes);
router.use("/bets", betRoutes);
router.use("/bet_results", betResultRoutes);
router.use("/rate_limits", rateLimitRoutes);
router.use("/round_results", roundResultRoutes);
router.use("/user_rate_limits", userRateLimitRoutes);
router.use("/operation_logs", operationLogRoutes);
router.use("/recalculates", recalculateRoutes);
router.use("/scanners", scannerRoutes);
router.use("/cameras", cameraRoutes);

module.exports = router;
