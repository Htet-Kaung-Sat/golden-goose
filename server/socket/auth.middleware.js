// [SECURITY FIX] Socket.IO handshake authentication.
// Validates JWT from httpOnly cookie (or scanner token from auth) and attaches socket.user for role-based event authorization.

const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { User, Role } = require("../models");
const { COOKIE_NAME } = require("../utils/authCookie");

module.exports = async function socketAuthMiddleware(socket, next) {
  // Scanner exception: allow connection with role "scanner" when handshake.auth.token matches SCANNER_TOKEN
  const scannerToken = socket.handshake.auth?.token;
  if (scannerToken && scannerToken === process.env.SCANNER_TOKEN) {
    socket.user = { role: "scanner" };
    return next();
  }

  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) {
    return next(new Error("Authentication required"));
  }

  const parsed = cookie.parse(cookieHeader);
  const token = parsed[COOKIE_NAME];
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      where: { id: decoded.id },
      attributes: ["id", "account", "token_version"],
      include: [{ model: Role, as: "role" }],
    });

    if (!user || !user.role) {
      return next(new Error("User not found"));
    }

    if (decoded.token_version !== user.token_version) {
      return next(new Error("Token invalid"));
    }

    socket.user = {
      id: user.id,
      role: user.role.name,
      account: user.account,
    };
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(new Error("Invalid token"));
    }
    next(err);
  }
};
