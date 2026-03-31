const { User, Role, sequelize } = require("../../models");
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/jwt");
const {
  setAuthCookie,
  generateCsrfToken,
  setCsrfCookie,
} = require("../../utils/authCookie"); // [SECURITY FIX] httpOnly cookie helpers
const { createOperationLog } = require("../admin/operation-log.controller.js");
const { getUpperestAgentData } = require("../../utils/common.js");
const { response } = require("../../utils/response.js");

const login = async (req, res) => {
  const { account, password, equipment, browser, ip_address } = req.body;
  try {
    const user = await User.findOne({
      where: { account },
      include: [{ model: Role, as: "role" }],
    });
    if (!user) {
      return res.status(401).json({
        message: "帐号密码错误",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "帐号密码错误",
      });
    }
    const roleName = user.role?.name;
    if (
      roleName !== "agent" &&
      roleName !== "sub_account" &&
      roleName !== "developer"
    ) {
      return res.status(403).json({
        message: "帐号密码错误",
      });
    }

    const parent = await User.findOne({
      where: { account: user.creator_account },
    });

    if (
      roleName === "sub_account" &&
      (user.state !== "online" ||
        parent.state !== "normal" ||
        parent.locking !== "normal")
    ) {
      return res.status(403).json({
        message: "登录失败 帐号禁止登录",
      });
    } else if (
      roleName === "agent" &&
      (user.state !== "normal" || user.locking !== "normal")
    ) {
      return res.status(403).json({
        message: "登录失败 帐号禁止登录",
      });
    }
    let upperestAgent = null;
    const t = await sequelize.transaction();
    try {
      await user.update(
        { token_version: user.token_version + 1 },
        { transaction: t },
      );
      if (roleName !== "developer") {
        const logData = {
          operator_user_id: roleName === "sub_account" ? parent.id : user.id,
          operated_user_id: roleName === "sub_account" ? parent.id : user.id,
          action: "login",
          ip_location: ip_address,
          operation_id: null,
          amount: null,
          remark: null,
        };
        await createOperationLog(t, logData);
      } else {
        upperestAgent = await getUpperestAgentData();
      }
    } catch (transactionError) {
      await t.rollback();
      throw transactionError;
    }
    await t.commit();
    if (roleName === "developer" && !upperestAgent) {
      return response(res, 500, false, "Developer data fetch failed");
    }
    // [SECURITY FIX] Set JWT in httpOnly cookie instead of sending in response body
    setAuthCookie(res, generateToken(user));

    // [SECURITY FIX] Set CSRF double-submit cookie and return token in response body
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    return res.json({
      csrfToken,
      id:
        roleName === "developer"
          ? upperestAgent.id
          : roleName === "sub_account"
            ? parent.id
            : user.id,
      account:
        roleName === "developer"
          ? upperestAgent.account
          : roleName === "sub_account"
            ? parent.account
            : user.account,
      role: roleName === "developer" ? "agent" : roleName,
      login_id: roleName === "developer" ? upperestAgent.id : user.id,
      login_account:
        roleName === "developer" ? upperestAgent.account : user.account,
      day_limit: user.day_limit,
      dev_account: roleName === "developer" ? user.account : null,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

/**
 * [SECURITY FIX] Admin auth verify.
 * Called by the admin layout on mount to validate the httpOnly cookie server-side.
 * Expects req.user to be set by protect middleware; ensures role is allowed for admin (agent, sub_account, developer).
 * Returns 403 if role is not allowed so the client can redirect to /admin/login.
 */
const verify = async (req, res) => {
  const roleName = req.user?.role?.name;
  const allowedRoles = ["agent", "sub_account", "developer"];
  if (!roleName || !allowedRoles.includes(roleName)) {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Not authorized for admin",
    });
  }
  return res.json({ valid: true });
};

module.exports = { login, verify };
