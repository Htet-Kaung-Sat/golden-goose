# Security Fixes Guide

This document outlines all identified security vulnerabilities in the Kinpo server application and provides guidance on how to resolve each one.

> For client-side vulnerabilities and fixes, see [`client/SECURITY_FIXES.md`](../client/SECURITY_FIXES.md).

---

## CRITICAL

### 1. Hardcoded Production Database Password — ⚠️ UNFIXED

**File:** `config/config.json` (production block)

**Problem:**
The production database password (`S0ftgu1de!@#`) is committed to the repository in plain JSON. Anyone with read access to the repo — current or former team members, CI logs, mirrors — can obtain full database credentials. If the repository is ever exposed publicly the database is immediately compromised.

**Fix:**
- Remove the literal password from `config/config.json`.
- Use Sequelize's `use_env_variable` option or switch to a `.env`-based config so production credentials are loaded from environment variables at runtime:
  ```json
  "production": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "mysql",
    "timezone": "+06:30"
  }
  ```
  Or keep individual fields and reference env vars:
  ```json
  "production": {
    "username": "root",
    "password": null,
    "database": "kinpo_production",
    "host": "127.0.0.1",
    "dialect": "mysql",
    "timezone": "+06:30",
    "use_env_variable": "DB_PASSWORD"
  }
  ```
- Add `config/config.json` to `.gitignore` (or replace it with `config/config.js` that reads from `process.env`).
- Rotate the exposed password immediately on any production instance.

---

## HIGH

### 2. Auth Rate Limiter Disabled — ✅ FIXED

**Files:** `server/middleware/rateLimit.middleware.js`, `server/routes/*/auth.routes.js`

**Problem:**
The `authLimiter` middleware for `/api/auth` was commented out. Without rate limiting, an attacker could send unlimited login attempts, enabling brute-force and credential-stuffing attacks against all three login endpoints (admin, operator, player).

**Fix applied:**
- Added `middleware/rateLimit.middleware.js` with a shared `loginLimiter` (20 attempts per IP per 15 minutes, JSON message when blocked).
- Applied `loginLimiter` only to the three login routes: `POST /login`, `POST /operator_login`, `POST /player_login`. Logout and verify are not rate-limited.
- Removed the commented-out limiter block from `server.js`.

---

### 3. Socket.IO Game Events Unauthenticated — ✅ FIXED

**Files:** `socket/index.js`, `socket/game.socket.js`, `socket/auth.middleware.js`

**Problem:**
Any WebSocket client could connect and emit game-critical events — `desk:{id}:startTimer`, `desk:{id}:status`, `desk:{id}:result`, `member_topup:{id}:change`, `online_player:{id}:logout`, etc. There was no handshake authentication or role check.

**Fix applied:**
- Added `socket/auth.middleware.js` that parses the `auth_token` httpOnly cookie from `socket.handshake.headers.cookie`, verifies the JWT, loads the user (and role) from the DB, and attaches `socket.user`. Scanner connections are allowed via `handshake.auth.token` matching `SCANNER_TOKEN`.
- Registered the middleware with `io.use(socketAuthMiddleware)` in `socket/index.js` before the connection handler.
- In `game.socket.js`, added role-based checks: only role `operator` can emit desk events (timer, status, result, dealCard, etc.) and net-amount events; only `admin`, `developer`, or `sub_account` can emit `online_player:*:logout`, `user_announcement:*:change`, `member_topup:*:change`. Unauthorized emits are ignored and a warning is logged.

---

## MEDIUM

### 4. Sensitive Configuration Committed to Repository — ⚠️ UNFIXED

**File:** `config/config.json`

**Problem:**
Full database credentials (username, host, database name) for all environments are stored in a JSON file tracked by git. Even if the production password is moved to env (issue #1), the remaining config reveals infrastructure details and development/test credentials.

**Fix:**
- Replace `config/config.json` with `config/config.js` that reads all values from environment variables.
- Add `config/config.json` to `.gitignore`.
- Provide a `config/config.example.json` (with placeholder values) so developers know which variables to set.

---

### 5. Required Environment Variables Not Validated at Startup — ⚠️ UNFIXED

**Files:** `server.js`, `middleware/auth.middleware.js`

**Problem:**
The server relies on `JWT_SECRET`, `CLIENT_URL`, `PORT`, and `SCANNER_TOKEN` from `process.env` but never verifies they are present. If any variable is missing or empty, the app starts silently and produces hard-to-debug runtime errors (e.g., JWT verification always fails, CORS allows `undefined` origin).

**Fix:**
- Add a bootstrap check that runs before `app.listen`:
  ```js
  const required = ["JWT_SECRET", "CLIENT_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
  ```
- Optionally validate format (e.g., `JWT_SECRET` minimum length, `CLIENT_URL` is a valid URL).

---

## LOW

### 6. Global Error Handler Leaks Internal Details — ⚠️ UNFIXED

**File:** `server.js` (lines 90–96)

**Problem:**
The error handler returns `err.message` to the client and logs the full error with `console.error(err)`. In production, `err.message` can contain stack traces, SQL queries, or file paths that help an attacker understand the server internals.

**Fix:**
- In production, return a generic message and log the full error server-side only:
  ```js
  app.use((err, req, res, next) => {
    console.error(err);
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error";
    res.status(err.status || 500).json({ success: false, message });
  });
  ```
- Consider a structured logger (e.g., winston, pino) for production log management.

---

### 7. Large JSON Body Limit (10 MB) — ⚠️ UNFIXED

**File:** `server.js` (line 63)

**Problem:**
`express.json({ limit: "10mb" })` applies globally. Most API endpoints exchange small JSON payloads (< 100 KB). A 10 MB limit allows an attacker to send large payloads to any route, increasing memory pressure and potential for denial-of-service.

**Fix:**
- Lower the global limit to a sensible default (e.g., `"256kb"` or `"1mb"`).
- Apply a higher limit only on routes that genuinely need it (e.g., file uploads or batch operations) using route-level middleware:
  ```js
  router.post("/upload", express.json({ limit: "10mb" }), uploadController);
  ```

---

---

### 8. Logout Endpoint is Unauthenticated — ⚠️ UNFIXED

**File:** `controllers/user/auth.controller.js` (lines 91–118), `routes/user/auth.routes.js`

**Problem:**
`POST /api/auth/player_logout` accepts a raw `userId` from the request body and sets `login_flg = false` for that user. The route is mounted under `/api/auth` which has **no auth middleware** (by design, since login/logout are public). This means any client — even unauthenticated — can log out any player by guessing or enumerating user IDs.

Additionally, `User.update` with an `include` option (lines 97–108) does not filter by role as intended — Sequelize `update` does not support `include` for filtering. The `where: { name: "member" }` on the Role include is silently ignored.

**Fix:**
- **Option A (recommended):** Protect the logout route with `authMiddleware` and read the user ID from `req.user.id` instead of `req.body.userId`. This ensures only the authenticated user can log themselves out.
- **Option B:** If the route must remain public (for `navigator.sendBeacon` on tab close), validate the `userId` against the auth cookie. Extract the JWT from the cookie, verify it, and confirm the `userId` matches the token's `id` claim.
- Fix the Sequelize `update` call to use a proper `WHERE` clause with a subquery or a separate `findOne` + `update` pattern that actually checks the role.

---

### 9. Balance Stored as INTEGER (Financial Data Loss) — ⚠️ UNFIXED

**File:** `models/user.js` (line 49)

**Problem:**
`User.balance` is defined as `DataTypes.INTEGER`, but the `Transaction` model uses `DECIMAL(10, 3)` for `amount`, `before_amount`, and `after_amount`. When a user's balance has fractional amounts (e.g., from commission calculations at `bonus_rate / 100`), the integer truncation silently drops the decimal portion. Over many transactions, this accumulates into significant financial discrepancies.

Example: A commission of `150 * (0.8 / 100) = 1.2` is stored as `1` in user balance, losing `0.2` per transaction.

**Fix:**
- Change `balance: DataTypes.INTEGER` to `balance: DataTypes.DECIMAL(16, 3)` in the User model.
- Create a migration to `ALTER TABLE Users MODIFY balance DECIMAL(16, 3) DEFAULT 0`.
- Audit all code that reads/writes `user.balance` to ensure it handles decimal values correctly (use `Number()` conversion, avoid integer arithmetic).

---

### 10. SQL Injection Surface via Template Literals — ⚠️ UNFIXED

**Files:** `controllers/user/user.controller.js` (lines 386–393, 509–520), `utils/common.js` (line 84)

**Problem:**
Several places use JavaScript template literals inside `sequelize.literal()`:

```js
sequelize.literal(`(
  SELECT br2.image FROM BetResults br2
  WHERE ... AND br2.bet_id = ${bet.id}
  ...
)`)
```

While `bet.id` comes from a database query (not directly from user input), this pattern is dangerous because:
1. If the data flow ever changes (e.g., `bet.id` is derived from user input in a refactor), it becomes a direct SQL injection vector.
2. It bypasses Sequelize's parameterization, setting a precedent that other developers may copy with user-supplied values.
3. In `utils/common.js` line 84, `${rootFilter}` is a string built from a function parameter — if `notRoot` is ever derived from user input, this becomes injectable.

**Fix:**
- Replace all `${variable}` interpolations inside `sequelize.literal()` with Sequelize replacements:
  ```js
  sequelize.literal(`(
    SELECT br2.image FROM BetResults br2
    WHERE ... AND br2.bet_id = :betId
    ...
  )`)
  // Pass { replacements: { betId: bet.id } } to the query options
  ```
- For `common.js`, pass the filter as a parameterized WHERE clause rather than string concatenation.

---

### 11. No Input Validation on Betting Endpoints — ⚠️ UNFIXED

**File:** `controllers/user/user.controller.js`

**Problem:**
Critical financial endpoints lack Joi validation:

| Endpoint | Function | Missing Validation |
|----------|----------|-------------------|
| `POST /user/bet_results` | `createBetResult` | `last_round` and `bets` array (result_id, amount) taken directly from `req.body` |
| `POST /user/cancle_bet_results` | `cancelBetResult` | `last_round` taken directly from `req.body` |
| `PUT /user/bet_keys` | `updateBetKey` | `last_round`, `result_id`, `new_result_id` taken directly from `req.body` |

A malicious user could submit negative bet amounts, invalid result IDs, or manipulated round IDs. While some checks exist at the database level (foreign key constraints), there is no explicit validation of data types, ranges, or business rules.

**Fix:**
- Add Joi schemas for all betting endpoints:
  ```js
  const createBetResultSchema = Joi.object({
    last_round: Joi.number().integer().positive().required(),
    bets: Joi.array().items(
      Joi.object({
        result_id: Joi.number().integer().positive().required(),
        amount: Joi.number().integer().positive().min(1).required(),
        image: Joi.string().allow("", null),
      })
    ).min(1).required(),
  });
  ```
- Validate bet amounts against the user's current balance and the configured rate limits before processing.

---

### 12. Controller Error Handlers Leak `error.message` — ⚠️ UNFIXED

**Files:** All controllers in `controllers/user/`, `controllers/operator/`, `controllers/admin/`

**Problem:**
Nearly every controller catch block returns `error.message` to the client:
```js
catch (error) {
  return response(res, 500, false, "Server error", { error: error.message });
}
```

This is separate from the global error handler (issue #6). Even if the global handler is fixed, these per-controller responses still leak internal error details (Sequelize validation messages, SQL syntax errors, file paths) directly to the client.

**Fix:**
- Remove `{ error: error.message }` from all 500 responses in controllers.
- Log the error server-side with `console.error(error)` (or a structured logger).
- Return only `response(res, 500, false, "Server error")` to the client.
- Consider an `asyncHandler` wrapper that catches errors and passes them to the global error handler instead of handling them per-controller.

---

### 13. Bug in Admin Auth: Typo in Role Check — ⚠️ UNFIXED

**File:** `controllers/admin/auth.controller.js` (lines 97–98)

**Problem:**
The admin login response has `roleName === "develop"` (missing "er") instead of `roleName === "developer"`:
```js
id: roleName === "develop" ? upperestAgent.id : ...,
account: roleName === "develop" ? upperestAgent.account : ...,
```

This means when a developer logs in, the condition is always `false`, so they receive their own `id` and `account` instead of the upperest agent's. This is inconsistent with the `login_id` and `login_account` fields on lines 109–111 which correctly use `"developer"`. The developer user gets a mismatched `id` vs `login_id` in the response.

**Fix:**
- Change `"develop"` to `"developer"` on lines 97 and 102.

---

## Priority Order for Fixes

| Priority | Issue # | Effort | Impact |
|----------|---------|--------|--------|
| 1st | #1 — Remove hardcoded production DB password | Low | Eliminates credential exposure |
| 2nd | #3 — Authenticate Socket.IO connections | Medium | Prevents game event spoofing |
| 3rd | #8 — Authenticate logout endpoint | Low | Prevents forced player logout |
| 4th | #9 — Fix balance INTEGER to DECIMAL | Low | Prevents financial data loss |
| 5th | #11 — Add betting endpoint validation | Medium | Prevents bet manipulation |
| 6th | #2 — Re-enable auth rate limiter | Low | Blocks brute-force attacks |
| 7th | #10 — Replace template literals in SQL | Medium | Eliminates injection surface |
| 8th | #13 — Fix developer role typo | Low | Fixes developer login response |
| 9th | #5 — Validate env vars at startup | Low | Catches misconfig before runtime |
| 10th | #4 — Move all config to env | Low | Removes secrets from repo |
| 11th | #12 — Stop leaking error.message in controllers | Low | Stops internal detail leaks |
| 12th | #6 — Sanitize global error handler | Low | Stops internal detail leaks |
| 13th | #7 — Lower global body size limit | Low | Reduces DoS surface |
