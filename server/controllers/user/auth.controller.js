const { User, Role, LoginInfo } = require("../../models");
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/jwt");
const {
  setAuthCookie,
  clearAuthCookie,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
} = require("../../utils/authCookie"); // [SECURITY FIX] httpOnly cookie helpers

const { response } = require("../../utils/response.js");

const login = async (req, res) => {
  const { account, password, equipment, browser, ip_address } = req.body;

  try {
    const user = await User.findOne({
      where: { account },
      include: [{ model: Role, as: "role" }],
    });
    const lastSerial = await LoginInfo.findOne({
      order: [["serial_number", "DESC"]],
    });
    let nextSerial = lastSerial ? parseInt(lastSerial.serial_number) + 1 : 1;
    const serial_number = String(nextSerial).padStart(8, "0");
    if (!user) {
      return res.status(401).json({
        message: "请确认帐号密码正确再试一次",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await LoginInfo.create({
        user_id: user.id,
        serial_number,
        state: "失败",
        equipment,
        browser,
        ip_address,
        site: "user",
      });
      return res.status(401).json({
        message: "请确认帐号密码正确再试一次",
      });
    }
    const roleName = user.role?.name;
    if (roleName !== "member") {
      await LoginInfo.create({
        user_id: user.id,
        serial_number,
        state: "禁止登录",
        equipment,
        browser,
        ip_address,
        site: "user",
      });
      return res.status(403).json({
        message: "帐号禁止登入",
      });
    }

    await LoginInfo.create({
      user_id: user.id,
      serial_number,
      state: "登录",
      equipment,
      browser,
      ip_address,
      site: "user",
    });

    await user.update({
      token_version: user.token_version + 1,
      ip_address,
      login_flg: true,
    });

    // [SECURITY FIX] Set JWT in httpOnly cookie instead of sending in response body
    setAuthCookie(res, generateToken(user));

    // [SECURITY FIX] Set CSRF double-submit cookie and return token in response body
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    return res.json({
      csrfToken,
      id: user.id,
      account: user.account,
      name: user.name,
      role: roleName,
    });
  } catch (error) {
    console.error(error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).send();
    await User.update(
      { login_flg: false },
      {
        where: { id: userId },
        include: [
          {
            model: Role,
            as: "role",
            where: {
              name: "member",
            },
          },
        ],
      },
    );
    // [SECURITY FIX] Clear the httpOnly auth cookie and CSRF cookie on logout
    clearAuthCookie(res);
    clearCsrfCookie(res);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return response(res, 500, false, "Server error", { error: error.message });
  }
};

const verify = async (req, res) => {
  return res.json({ valid: true, id: req.user.id });
};

module.exports = { login, logout, verify };
