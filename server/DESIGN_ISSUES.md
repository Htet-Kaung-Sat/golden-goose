# Design Issues Guide

This document outlines software design and code quality issues in the Kinpo server application and provides guidance on how to resolve each one.

> For client-side design issues, see [`client/DESIGN_ISSUES.md`](../client/DESIGN_ISSUES.md).

---

## HIGH

### 1. No Service Layer — Controllers Contain All Business Logic — ⚠️ UNFIXED

**Files:** All controllers in `controllers/`

**Problem:**
Controllers are responsible for request parsing, business logic, database queries, transaction management, and response formatting. This leads to:

- **350+ line functions** (e.g., `createResult` in `controllers/operator/operator.controller.js`) that are impossible to unit test without spinning up Express and a database.
- **Business logic intertwined with HTTP concerns** — settlement calculations, commission rules, and balance updates are embedded in controller functions, making them unreusable from other contexts (e.g., cron jobs, admin scripts, or Socket.IO event handlers).
- **No separation of concerns** — the same function validates input, queries the database, performs calculations, manages transactions, and formats the response.

**Fix:**
Introduce a service layer:

```
controllers/     → Thin: parse request, call service, send response
services/        → Business logic and database operations
  ├── auth.service.js
  ├── settlement.service.js
  ├── session.service.js
  ├── report.service.js
  ├── user.service.js
  └── bet.service.js
```

Example refactor for `createBetResult`:

```js
// controller (thin)
const createBetResult = async (req, res) => {
  const { error, value } = createBetResultSchema.validate(req.body);
  if (error) return response(res, 400, false, error.details[0].message);

  const result = await betService.placeBet(
    req.user.id,
    value.last_round,
    value.bets,
  );
  response(res, 200, true, "Bet results saved successfully", result);
};

// service (business logic)
class BetService {
  async placeBet(userId, roundId, bets) {
    const t = await sequelize.transaction();
    try {
      // all logic here, testable without Express
      await t.commit();
      return { totalBetAmount, remainingBalance, confirmedBets };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}
```

---

### 2. Massive Code Duplication — ⚠️ UNFIXED

**Files:** Multiple

**Problem:**

**A) Confirmed bets formatting duplicated twice:**
`controllers/user/user.controller.js` contains the DOUBLE_KEYS constant and the confirmed bets formatting logic in both `getConfirmedBets` (lines 402–425) and `createBetResult` (lines 527–545). These are identical blocks of code.

**B) Commission/wash-code SQL duplicated 3+ times:**
The same complex CASE/WHEN SQL for commission calculation appears in:

- `utils/common.js` → `getDirectOwnCommission` (lines 217–425)
- `controllers/user/user.controller.js` → `getUserBetResults` (lines 967–1070)
- `controllers/user/user.controller.js` → `getBetDetailsByDate` (lines 1092–1130)

Each copy has slight variations, making it unclear which is the "correct" version. Bug fixes applied to one copy are easily missed in the others.

**C) Response pattern inconsistency:**
Some controllers use `response(res, 500, false, "Server error", { error: error.message })`, others use `res.status(500).json({ success: false, message: "Server error", error: err.message })`. The `confirmAccount` function (line 783) even references `err.message` when the catch variable is named `error`.

**Fix:**

- Extract `formatConfirmedBets(betResults)` as a shared utility function.
- Extract commission SQL into a single `getCommissionSQL()` function in `utils/common.js`, parameterized for the different contexts.
- Standardize all controllers to use the `response()` helper exclusively.

---

### 3. No Test Infrastructure — ⚠️ UNFIXED

**File:** `package.json` (line 12)

**Problem:**
`"test": "echo \"Error: no test specified\" && exit 1"` — there are zero tests in the project. For a financial platform that handles real money (balance management, bet settlement, commission calculations), this creates significant risk:

- Settlement logic bugs (win/lose/tie/cancel/recalculate) can silently lose or create money.
- Refactoring is dangerous — any change to the 400-line commission query or 350-line settlement function has no safety net.
- Regression risk is high when multiple developers make changes.

**Fix:**

- Install a test framework: `npm install --save-dev jest` or `vitest`.
- Add critical test coverage in priority order:
  1. **Settlement logic** — given a set of bets and a result, verify correct balance changes, transaction records, and bet result flags for win/lose/tie/cancel.
  2. **Commission calculation** — given user hierarchy and bet history, verify correct wash code amounts and commission values.
  3. **Auth flow** — login, token generation, token validation, role-based access.
  4. **Balance integrity** — verify that the sum of all transactions equals the user's final balance.
- Use an in-memory SQLite database (or test MySQL database) for integration tests.

---

### 4. Inconsistent Error Handling Pattern — ⚠️ UNFIXED

**Files:** All controllers

**Problem:**
Three different error handling patterns are used:

**Pattern A (most common):**

```js
try { ... } catch (error) {
  return response(res, 500, false, "Server error", { error: error.message });
}
```

**Pattern B (some endpoints):**

```js
try { ... } catch (err) {
  console.error(err);
  return res.status(500).json({ success: false, message: "Server error", error: err.message });
}
```

**Pattern C (auth controllers):**

```js
try { ... } catch (error) {
  console.error(error);
  return res.status(500).json({ message: "Server error" });
}
```

The inconsistency means:

- Error variable naming is inconsistent (`error` vs `err`) — leading to the bug in `confirmAccount` where `err.message` is referenced but the variable is `error`.
- Some errors include `error.message` in the response, others don't.
- Some errors are logged, others aren't.

**Fix:**
Create an `asyncHandler` wrapper that eliminates try/catch boilerplate:

```js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage:
const getDesks = asyncHandler(async (req, res) => {
  const desks = await Desk.findAll({ ... });
  response(res, 200, true, "Desks fetched", { desks });
  // No try/catch needed — errors go to global handler
});
```

Then fix the global error handler (see SECURITY_FIXES.md #6) to handle all errors consistently.

---

## MEDIUM

### 5. Hardcoded Timezone Offset Mismatch — ⚠️ UNFIXED

**Files:** `config/config.json` (`"timezone": "+06:30"`), `controllers/user/user.controller.js` (multiple raw SQL queries)

**Problem:**
The Sequelize timezone is configured as `+06:30` (Myanmar Time), but multiple raw SQL queries use `INTERVAL 7 HOUR`:

```sql
-- In getUserBetResults (line 1059):
DATE(DATE_SUB(br.createdAt, INTERVAL 7 HOUR)) = CURDATE()

-- In getBetDetailsByDate (line 1170):
DATE(DATE_SUB(t.createdAt, INTERVAL 7 HOUR)) = :selectedDate

-- In getTransactions (line 890):
moment().startOf("day").add(7, "hours")
```

`+06:30` is 6 hours 30 minutes, but the code uses 7 hours. This means:

- Report dates are shifted by 30 minutes compared to what users expect.
- A bet placed at 06:45 local time would be attributed to the previous day in SQL (7h offset) but to the current day in Sequelize operations (6.5h offset).
- The `moment` calculations also use 7 hours, inconsistent with the DB timezone.

**Fix:**

- Define the timezone offset as a configuration variable (environment variable or config value).
- Use `+06:30` consistently everywhere, or switch to storing all timestamps in UTC and converting at display time.
- Replace hardcoded `INTERVAL 7 HOUR` with a parameterized offset derived from config.
- Replace `moment().add(7, "hours")` with proper timezone-aware date handling using `moment-timezone`.

---

### 6. No `.env.example` File — ⚠️ UNFIXED

**Problem:**
The project requires several environment variables (`JWT_SECRET`, `CLIENT_URL`, `PORT`, `SCANNER_TOKEN`, `NODE_ENV`) but provides no template or documentation for them. A new developer cloning the project has to discover required variables by reading the source code.

**Fix:**
Create a `.env.example` file:

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# Client URL (CORS origin)
CLIENT_URL=http://localhost:5173

# JWT Secret (use a strong random string, min 32 characters)
JWT_SECRET=change-me-to-a-random-secret

# Scanner Token (static auth token for card scanner devices)
SCANNER_TOKEN=change-me-to-a-random-token

# Database (if using env-based config instead of config/config.json)
# DB_HOST=127.0.0.1
# DB_NAME=kinpo_development
# DB_USER=root
# DB_PASSWORD=
```

---

### 7. Global `io` via `global.io` — ⚠️ UNFIXED

**File:** `server.js` (line 41)

**Problem:**
The Socket.IO server instance is attached to `global.io`, making it accessible from any module without explicit imports. This is a Node.js anti-pattern because:

- It creates hidden dependencies — modules use `global.io` without declaring it as a dependency.
- It makes testing difficult — you can't mock or stub `global.io` cleanly.
- It pollutes the global namespace, risking name collisions.

**Fix:**

- Pass the `io` instance explicitly to modules that need it:
  ```js
  const setupRoutes = (app, io) => { ... };
  ```
- Or create a singleton module:
  ```js
  // socket/io.js
  let io;
  module.exports = {
    setIO: (instance) => {
      io = instance;
    },
    getIO: () => io,
  };
  ```

---

### 8. Sequelize Associations Missing for Key Relationships — ⚠️ UNFIXED

**Files:** Model files in `models/`

**Problem:**
Some key associations are not defined in the models, forcing controllers to make manual queries instead of using eager loading:

- `Desk` has no `hasMany GameSession` association → `getDesks` manually queries sessions per desk.
- `GameSession` has no `hasMany GameRound` association → rounds are queried separately.
- `GameRound` has no `hasMany RoundResult` association → round results are queried separately.
- `GameRound` has no `hasMany Bet` association → bets are queried separately.

These missing associations are a root cause of the N+1 query performance issue (see PERFORMANCE_ISSUES.md #1).

**Fix:**
Add the missing associations to model files:

```js
// desk.js
Desk.hasMany(models.GameSession, { foreignKey: "desk_id", as: "sessions" });

// gamesession.js
GameSession.hasMany(models.GameRound, {
  foreignKey: "session_id",
  as: "rounds",
});

// gameround.js
GameRound.hasMany(models.RoundResult, {
  foreignKey: "round_id",
  as: "roundResults",
});
GameRound.hasMany(models.Bet, { foreignKey: "round_id", as: "bets" });
```

---

## LOW

### 9. `console.log` with `colors` Library for Production Logging — ⚠️ UNFIXED

**Files:** `server.js`, various controllers

**Problem:**
Production logging uses `console.log` with the `colors` library for formatting:

```js
console.log("Database connected".bgBlue.white);
console.log(`Server + Socket running on port ${PORT}`.bgGreen.white);
```

In production, `console.log` is not persistent, not structured, and not searchable. ANSI color codes in log files appear as garbage characters.

**Fix:**

- Replace `console.log` / `console.error` with a structured logger like `pino` or `winston`.
- Configure log levels (debug/info/warn/error) per environment.
- In production, output JSON logs for log aggregation tools.

---

### 10. Route Naming Inconsistency — ⚠️ UNFIXED

**Problem:**
API route naming is inconsistent:

| Pattern        | Examples                                                                             |
| -------------- | ------------------------------------------------------------------------------------ |
| Snake case     | `bet_results`, `game_rounds`, `rate_limits`, `user_rate_limits`                      |
| Camel case     | `gameRound`, `gameSession`, `roundResult`                                            |
| Typo           | `POST /user/cancle_bet_results` (should be "cancel")                                 |
| Mixed concerns | `PUT /user/game_rounds/:id` is under the user route but modifies game infrastructure |

**Fix:**

- Standardize on one naming convention (snake_case is most common for REST APIs).
- Fix the `cancle` typo to `cancel`.
- Move `game_rounds` update to the operator route since operators are the ones who change round status.

---

## Priority Order for Fixes

| Priority | Issue #                                 | Effort | Impact                                  |
| -------- | --------------------------------------- | ------ | --------------------------------------- |
| 1st      | #1 — Add service layer                  | High   | Enables testability and maintainability |
| 2nd      | #2 — Extract duplicated code            | Medium | Prevents bug propagation                |
| 3rd      | #3 — Add test infrastructure            | High   | Safety net for financial logic          |
| 4th      | #8 — Add missing Sequelize associations | Low    | Enables eager loading (fixes N+1)       |
| 5th      | #4 — Standardize error handling         | Low    | Code consistency                        |
| 6th      | #5 — Fix timezone handling              | Medium | Data correctness                        |
| 7th      | #6 — Create .env.example                | Low    | Developer onboarding                    |
| 8th      | #7 — Remove global.io                   | Low    | Cleaner architecture                    |
| 9th      | #9 — Add structured logging             | Medium | Production observability                |
| 10th     | #10 — Fix route naming                  | Low    | API consistency                         |
