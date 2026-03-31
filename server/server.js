const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // [SECURITY FIX] Added to parse httpOnly auth cookies
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const colors = require("colors");

const db = require("./models/index.js");

const adminRoute = require("./routes/admin/index.js");
const adminAuthRoute = require("./routes/admin/auth.routes.js");
const operatorRoute = require("./routes/operator/index.js");
const operatorAuthRoute = require("./routes/operator/auth.routes.js");
const {
  logoutBeacon: operatorLogoutBeacon,
} = require("./controllers/operator/auth.controller.js");
const userRoute = require("./routes/user/index.js");
const userAuthRoute = require("./routes/user/auth.routes.js");

const authMiddleware = require("./middleware/auth.middleware.js");
const { requireRole } = authMiddleware;
const csrfProtection = require("./middleware/csrf.middleware.js"); // [SECURITY FIX] CSRF double-submit verification

const ADMIN_ROLES = ["developer", "admin", "manager", "agent", "sub_account"];
const USER_ROLE = ["member"];
const OPERATOR_ROLE = ["staff"];

const mainSocket = require("./socket/index.js");
const loggerPromise = require("./logger.js");

const noopLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
};

dotenv.config();

/**
 * Logger initialization (secondary).
 * If init fails, app still starts using a no-op logger (no file logging).
 * If successful, global.logger is the real logger.
 */

loggerPromise
  .catch((err) => {
    console.error("Logger init failed:", err);
    return null;
  })
  .then((logger) => {
    logger = logger || noopLogger;
    global.logger = logger;

    const app = express();
    const server = http.createServer(app);

    // You only need app.set("trust proxy", 1) if the server is behind a reverse proxy; otherwise you can leave it unset. If in doubt (e.g. production might use nginx), adding trust proxy is the right thing to do so rate limiting and IP-based logic use the real client IP.
    // If behind a reverse proxy (nginx, load balancer, etc.), use client IP from X-Forwarded-For
    app.set("trust proxy", 1); // 1 = trust first proxy

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
      },
    });

    // Make io global
    global.io = io;

    // Start socket handlers
    mainSocket(io);

    // Security middlewares
    app.use(helmet());
    app.use(compression());
    app.use(morgan("dev"));
    app.use(cookieParser()); // [SECURITY FIX] Parse cookies so auth middleware can read httpOnly auth_token
    app.use(express.urlencoded({ extended: true }));

    app.use(
      cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "x-client-page",
          "X-CSRF-Token",
        ],
        exposedHeaders: [
          "x-user-balance",
          "x-user-total-balance",
          "x-user-permission",
        ],
      }),
    );

    app.use(express.json({ limit: "1mb" }));
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));

    // API routes (login rate limit applied per-route in auth routers)
    app.use("/api/auth", adminAuthRoute);
    app.use("/api/auth", operatorAuthRoute);
    app.use("/api/auth", userAuthRoute);

    // [SECURITY FIX] Protected routes use both auth + CSRF double-submit verification; role check per route
    app.use(
      "/api/admin",
      authMiddleware,
      requireRole(ADMIN_ROLES),
      csrfProtection,
      adminRoute,
    );
    // Operator logout beacon: no CSRF (sendBeacon cannot set headers); auth only; schedules delayed logout
    app.post(
      "/api/operator/auth/logout-beacon",
      authMiddleware,
      requireRole(OPERATOR_ROLE),
      operatorLogoutBeacon,
    );
    app.use(
      "/api/operator",
      authMiddleware,
      requireRole(OPERATOR_ROLE),
      csrfProtection,
      operatorRoute,
    );
    app.use(
      "/api/user",
      authMiddleware,
      requireRole(USER_ROLE),
      csrfProtection,
      userRoute,
    );

    // DB Connect
    db.sequelize
      .authenticate()
      .then(() => {
        console.log("Database connected".bgBlue.white);
        logger.info("Database connected");
      })
      .catch((err) => {
        console.log("DB Error:", err);
        logger.error({ err }, "DB Error");
      });

    // Global error handler (production: generic message; dev: full message for debugging)
    app.use((err, req, res, next) => {
      console.error(err);
      logger.error(
        { err, method: req.method, url: req.url },
        "Unhandled error",
      );
      const message =
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : err.message || "Internal Server Error";
      res.status(err.status || 500).json({ success: false, message });
    });

    // Start server + socket
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server + Socket running on port ${PORT}`.bgGreen.white);
      logger.info({ port: PORT }, "Server + Socket running");
    });
  });
