const rateLimit = require("express-rate-limit");

// ip address will be from the X-Forwarded-For header if the server is behind a reverse proxy
// req.ip will be set automatically if trust proxy is set
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

module.exports = { loginLimiter };
