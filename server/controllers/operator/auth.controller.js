const { User, Desk, Role } = require("../../models");
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/jwt");
const {
  setAuthCookie,
  clearAuthCookie,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
} = require("../../utils/authCookie");

const {
  addPending,
  cancelPending,
} = require("../../utils/operatorPendingLogout");
const jwt = require("jsonwebtoken");

const { response } = require("../../utils/response.js");

const login = async (req, res) => {
  const { account, password, desk_no } = req.body;

  try {
    const user = await User.findOne({
      where: { account },
      include: [{ model: Role, as: "role" }],
    });

    if (!user) {
      return res.status(401).json({
        message: "请确认帐号密码正确再试一次",
      });
    }

    if (user.login_flg) {
      return res.status(403).json({
        message: "您的账号已在其他地方登录",
      });
    }

    const desk = await Desk.findOne({
      where: { desk_no },
    });

    if (!desk) {
      return res.status(401).json({
        message: "无效的台号，请确认后再试一次",
      });
    }

    if (user.desk_id !== desk.id) {
      return res.status(403).json({
        message: "此帐号与台号不匹配，请确认后再试一次",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "请确认帐号密码正确再试一次",
      });
    }

    const roleName = user.role?.name;

    if (roleName !== "staff") {
      return res.status(403).json({
        message: "帐号禁止登入",
      });
    }

    // [SECURITY FIX] Set JWT in httpOnly cookie instead of sending in response body
    setAuthCookie(res, generateToken(user));

    // [SECURITY FIX] Set CSRF double-submit cookie and return token in response body
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    await user.update({
      login_flg: true,
    });

    return res.json({
      csrfToken,
      id: user.id,
      account: user.account,
      name: user.name,
      role: roleName,
      desk_id: desk.id,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

/**
 * [SECURITY FIX] Operator auth verify.
 * Called by the operator layout on mount to validate the httpOnly cookie server-side.
 * Expects req.user to be set by protect middleware; ensures role is staff.
 * Returns 403 if not staff so the client can redirect to /operator/login.
 */
const verify = async (req, res) => {
  const roleName = req.user?.role?.name;
  if (roleName !== "staff") {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Not authorized for operator",
    });
  }
  return res.json({ valid: true });
};

const logout = async (req, res) => {
  try {
    const token = req.cookies?.auth_token;
    if (token) cancelPending(token);
    const user = await User.findOne({
      where: { id: req.user.id },
    });
    if (!user) {
      return res.status(401).json({
        message: "请确认帐号密码正确再试一次",
      });
    }
    clearAuthCookie(res);
    clearCsrfCookie(res);
    await user.update({
      login_flg: false,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Operator logout error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const logoutBeacon = async (req, res) => {
  try {
    const roleName = req.user?.role?.name;
    if (roleName !== "staff") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    const token = req.cookies?.auth_token;
    if (token) {
      addPending(token, {
        onExpire(t) {
          const decoded = jwt.decode(t);
          if (decoded?.id) {
            User.update(
              { login_flg: false },
              { where: { id: decoded.id } },
            ).catch((err) =>
              console.error("Operator beacon onExpire update error:", err),
            );
          }
        },
      });
    }
    return res.status(200).end();
  } catch (error) {
    console.error("Operator logout beacon error:", error);
    return res.status(500).end();
  }
};

module.exports = { login, verify, logout, logoutBeacon };
