const jwt = require("jsonwebtoken");
const { User, Role } = require("../models");
const { getUpperestAgentData } = require("../utils/common");
const {
  isBlacklisted,
  cancelPending,
} = require("../utils/operatorPendingLogout");
const { clearAuthCookie, clearCsrfCookie } = require("../utils/authCookie");

const protect = async (req, res, next) => {
  // [SECURITY FIX] Read JWT from httpOnly cookie first, fallback to Authorization header
  const authHeader = req.headers.authorization;
  const token =
    req.cookies?.auth_token ||
    (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

  if (!token) {
    return res.status(401).json({
      error: "TOKEN_INVALID",
      message: "No token, not authorized",
    });
  }

  if (isBlacklisted(token)) {
    clearAuthCookie(res);
    return res.status(401).json({
      error: "TOKEN_INVALID",
      message: "Session ended (tab closed)",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({
      where: { id: decoded.id },
      attributes: { exclude: ["password"] },
      include: [{ model: Role, as: "role" }],
    });

    if (!user) {
      return res.status(401).json({
        error: "TOKEN_INVALID",
        message: "User not found, not authorized",
      });
    }

    if (user.role.name === "agent") {
      if (user.state !== "normal" || user.locking !== "normal") {
        return res.status(403).json({ error: "PROHIBITED_ACCESS" });
      }
    } else if (user.role.name === "sub_account") {
      const adminUser = await User.findOne({
        where: { account: user.creator_account },
      });
      if (
        user.state !== "online" ||
        adminUser.state !== "normal" ||
        adminUser.locking !== "normal"
      ) {
        return res.status(403).json({ error: "PROHIBITED_ACCESS" });
      }
      const permissions = user.permission ? user.permission.split("|") : [];
      const clientPath = req.headers["x-client-page"];
      const isAllowed =
        clientPath === "admin" || permissions.includes(clientPath);
      if (!isAllowed) {
        return res.status(403).json({ error: "ILLEGAL_ACCESS" });
      }
    } else if (user.role.name === "developer") {
      const upperestAgent = await getUpperestAgentData();
    }
    if (decoded.token_version !== user.token_version) {
      return res.status(401).json({
        error: "TOKEN_INVALID",
        message: "账号已在其他设备登录，请重新登录",
      });
    }
    req.user = user;
    cancelPending(token);
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError" && token) {
      const decoded = jwt.decode(token);
      if (decoded?.id) {
        const user = await User.findOne({
          where: { id: decoded.id },
          include: [{ model: Role, as: "role" }],
        });
        if (user && user.role?.name === "member") {
          await user.update({ login_flg: false });
        }
      }
    }

    return res.status(401).json({
      error: "TOKEN_INVALID",
      message: "Not authorized, token failed",
    });
  }
};

/**
 * Returns middleware that allows only the given role names.
 * Must be used after protect (authMiddleware); req.user.role must be set.
 * @param {string[]} allowedRoles - Role names (e.g. ["developer", "admin", "member"])
 */
const requireRole = (allowedRoles) => (req, res, next) => {
  const roleName = req.user?.role?.name;
  if (!roleName) {
    clearAuthCookie(res);
    clearCsrfCookie(res);
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Role not found",
    });
  }
  if (!allowedRoles.includes(roleName)) {
    clearAuthCookie(res);
    clearCsrfCookie(res);
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "该角色无权访问",
    });
  }
  next();
};

module.exports = protect;
module.exports.requireRole = requireRole;
