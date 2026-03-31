// [SECURITY FIX] CSRF double-submit cookie verification middleware.
// For POST/PUT/PATCH/DELETE: compares the httpOnly csrf_token cookie against
// the X-CSRF-Token request header using constant-time comparison.
// GET/HEAD/OPTIONS are safe methods and are allowed through without a check.

const crypto = require("crypto");
const { CSRF_COOKIE_NAME } = require("../utils/authCookie");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      error: "CSRF_VALIDATION_FAILED",
      message: "Missing CSRF token",
    });
  }

  try {
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);

    if (
      cookieBuf.length !== headerBuf.length ||
      !crypto.timingSafeEqual(cookieBuf, headerBuf)
    ) {
      return res.status(403).json({
        error: "CSRF_VALIDATION_FAILED",
        message: "Invalid CSRF token",
      });
    }
  } catch {
    return res.status(403).json({
      error: "CSRF_VALIDATION_FAILED",
      message: "Invalid CSRF token",
    });
  }

  next();
};

module.exports = csrfProtection;
