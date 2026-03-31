// [SECURITY FIX] JWT stored in httpOnly cookie instead of being sent in response body.
// The browser cannot read this cookie via JS (prevents XSS token theft).

const crypto = require("crypto");

const COOKIE_NAME = "auth_token";
const CSRF_COOKIE_NAME = "csrf_token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
});

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: SEVEN_DAYS_MS,
  });
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
};

// [SECURITY FIX] CSRF double-submit cookie helpers.
// A random token is stored in a non-httpOnly cookie so the client JS can read it.
// The client sends the token back via X-CSRF-Token header on state-changing requests.
// The server middleware compares cookie vs header (constant-time) to block CSRF.

const generateCsrfToken = () => crypto.randomBytes(32).toString("hex");

const setCsrfCookie = (res, token) => {
  res.cookie(CSRF_COOKIE_NAME, token, {
    ...cookieOptions(),
    httpOnly: false,
    maxAge: SEVEN_DAYS_MS,
  });
};

const clearCsrfCookie = (res) => {
  res.clearCookie(CSRF_COOKIE_NAME, cookieOptions());
};

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  COOKIE_NAME,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
  CSRF_COOKIE_NAME,
};
