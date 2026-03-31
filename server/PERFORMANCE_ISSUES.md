# Performance Issues Guide

This document outlines all identified performance problems in the Kinpo server application and provides guidance on how to resolve each one.

> For client-side performance issues, see [`client/PERFORMANCE_ISSUES.md`](../client/PERFORMANCE_ISSUES.md).

---

## CRITICAL

### 1. N+1 Query Waterfall in `getDesks` — ⚠️ UNFIXED

**File:** `controllers/user/user.controller.js` (lines 53–136)

**Problem:**
The `getDesks` endpoint is called every time a player loads the Home page (game lobby). For each desk, it issues 3–4 separate database queries sequentially:

```
For each desk (N desks):
  1. GameSession.findOne({ where: { desk_id, status: "active" } })
  2. GameRound.findOne({ where: { session_id }, order: DESC })
  3. GameRound.findAll({ where: { session_id }, order: ASC })
  4. RoundResult.findAll({ where: { round_id: roundIds }, include: Result })
```

With 20 desks, this produces **~80 database queries** per single API call. Under concurrent player load (e.g., 100 players refreshing the lobby), the database is hit with 8,000 queries for what should be a single data fetch.

**Fix:**
Rewrite using Sequelize eager loading to reduce to 1–2 queries:

```js
const desks = await Desk.findAll({
  include: [
    { model: Game, as: "game" },
    {
      model: GameSession,
      as: "sessions",
      where: { status: "active" },
      required: false,
      include: [{
        model: GameRound,
        as: "rounds",
        include: [{
          model: RoundResult,
          as: "roundResults",
          include: [{ model: Result, as: "result" }],
        }],
      }],
    },
  ],
  order: [["position", "ASC"]],
});
```

Then transform the data in JavaScript instead of N+1 queries. This requires adding `hasMany` associations from Desk → GameSession and GameSession → GameRound if not already defined.

Alternatively, write a single raw SQL query with JOINs that returns all desks with their active session, last round, and results in one trip.

---

### 2. No Database Indexes — ✅ FIXED

**Files:** All 26 files in `migrations/`

**Problem:**
Zero `addIndex` calls exist across all migration files. Every query that uses a `WHERE`, `JOIN`, or `ORDER BY` clause performs a full table scan. As data grows, query performance degrades linearly.

Key missing indexes and their impact:

| Table | Column(s) | Used By | Impact |
|-------|-----------|---------|--------|
| `Users` | `account` | Every login, all hierarchy CTEs | Every login scans entire Users table |
| `Users` | `creator_account` | All recursive hierarchy queries | Recursive CTE joins scan full table per level |
| `Users` | `role_id` | Auth middleware (every request) | |
| `GameSessions` | `desk_id, status` (composite) | `getDesks`, `getGameInfos`, `getNiuniuResults` | Lobby load scans all sessions |
| `GameRounds` | `session_id` | Round lookups in every game operation | |
| `BetResults` | `bet_id` | Settlement, bet confirmation, cancellation | |
| `BetResults` | `result_id` | Settlement, reporting | |
| `Transactions` | `user_id, createdAt` (composite) | Transaction history, reports | Report queries scan all transactions |
| `Transactions` | `bet_result_id` | Settlement, bet update | |
| `RoundResults` | `round_id` | Result lookups, roadmap data | |
| `Bets` | `round_id, user_id` (composite) | Bet lookup per round per user | |
| `NiuniuRounds` | `game_round_id` | Niuniu result queries | |
| `NiuniuPlayerHands` | `niuniu_round_id` | Niuniu hand queries | |
| `LoginInfos` | `user_id` | Login history | |
| `LoginInfos` | `serial_number` | Serial number generation | |

**Fix:** Implemented in `migrations/20250303120000-add-performance-indexes.js`. Adds indexes for creator_account, role_id, GameSessions (desk_id, status), GameRounds (session_id), BetResults (bet_id, result_id), Transactions (user_id+createdAt, bet_result_id), RoundResults (round_id), Bets (round_id, user_id), NiuniuRounds (game_round_id), NiuniuPlayerHands (niuniu_round_id), LoginInfos (user_id, serial_number). Users.account already has a unique index from createTable.

---

## HIGH

### 3. `getTotalBalance` Runs on Every Authenticated Request — ✅ FIXED

**File:** `middleware/auth.middleware.js`, `utils/common.js` (`getTotalBalance`)

**Problem (was):**
For `agent`, `sub_account`, and `developer` roles, the auth middleware called `getTotalBalance()` on **every single API request**, running a recursive CTE that traverses the entire user hierarchy tree.

**Fix applied (Option B):**
- Removed `getTotalBalance()` from auth middleware. The middleware now only sets `x-user-balance` (cheap, from `user.balance`) and `x-user-permission`.
- Added dedicated endpoint `GET /api/admin/users/me/balance` that returns `{ balance, totalBalance, permission }`. This runs `getTotalBalance()` only when the admin dashboard needs it.
- Client `LoadingContext` fetches from this endpoint when on admin pages (on mount/navigate) and polls every 30 seconds. Response headers still provide `x-user-balance` for quick updates; `totalBalance` comes only from the dedicated endpoint.

---

### 4. Operator `getGameInfos` Creates Side Effects on GET — ⚠️ UNFIXED

**File:** `controllers/operator/operator.controller.js` (lines 47–140)

**Problem:**
The `GET /operator/game_infos/:id` endpoint creates database records (GameSession + GameRound) as a side effect when no active session exists (lines 67–88). This is a GET request that mutates state, violating REST conventions and causing issues:

1. Browser prefetch or link preview tools may trigger unintended session creation.
2. Retry logic on network failure creates duplicate sessions.
3. Multiple operators calling the endpoint simultaneously may create race conditions.

Additionally, this function runs 5 sequential queries even when a session already exists: desk, session, lastRound, sessionCount, all rounds, roundResults.

**Fix:**
- Split into two endpoints: `GET /operator/game_infos/:id` (read-only) and `POST /operator/game_sessions/:desk_id` (creates session).
- Use eager loading to reduce the read queries.
- Add a database-level unique constraint on `(desk_id, status)` where `status = 'active'` to prevent duplicate active sessions.

---

### 5. No Connection Pool Configuration — ⚠️ UNFIXED

**File:** `config/config.json`

**Problem:**
No Sequelize `pool` settings are configured. Sequelize defaults to `{ max: 5, min: 0, acquire: 60000, idle: 10000 }`. With the N+1 query patterns above, 5 connections are quickly exhausted under concurrent load. When connections are exhausted, requests queue up and eventually timeout.

**Fix:**
Add pool configuration appropriate for the expected load:
```json
{
  "development": {
    "pool": { "max": 10, "min": 2, "acquire": 30000, "idle": 10000 }
  },
  "production": {
    "pool": { "max": 25, "min": 5, "acquire": 30000, "idle": 10000 }
  }
}
```

Monitor connection usage in production and adjust `max` based on actual concurrent query load.

---

## MEDIUM

### 6. Serial Number Generation via `findOne` + Increment — ⚠️ UNFIXED

**File:** `controllers/user/auth.controller.js` (lines 14–17)

**Problem:**
Login serial number generation uses `LoginInfo.findOne({ order: [["serial_number", "DESC"]] })` and then increments. Under concurrent logins, two requests can read the same max serial number and produce duplicates.

**Fix:**
- Use an auto-increment column for `serial_number`, or
- Use a database sequence, or
- Use `LoginInfo.max("serial_number")` inside a transaction with a lock.

---

### 7. Large Raw SQL Queries Without Query Plan Optimization — ⚠️ UNFIXED

**Files:** `utils/common.js` (`getDirectOwnCommission` — 400+ lines), `controllers/user/user.controller.js` (`getUserBetResults` — 100+ line SQL, `getBetDetailsByDate` — 130+ line SQL)

**Problem:**
These queries join 5–7 tables, use correlated subqueries, recursive CTEs, and complex CASE expressions. Without proper indexes (issue #2), these queries are extremely slow. Even with indexes, the correlated subqueries (e.g., looking up opposing bet results) execute per-row, not per-query.

Specific issues:
- `getDirectOwnCommission`: Joins Users, Bets, BetResults, GameRounds, GameSessions, Desks, Results. Contains correlated subqueries that find opposing bets (banker vs player) by scanning BetResults per row.
- `getUserBetResults`: Similar pattern with grouped aggregation across 7 tables.
- The `INTERVAL 7 HOUR` time offset is hardcoded and doesn't match the `+06:30` timezone in config (see Design Issues).

**Fix:**
- Create database views for the common report aggregations.
- Replace correlated subqueries with JOINs or window functions.
- Add composite indexes specifically for the JOIN conditions used in these queries.
- Consider materializing frequently-accessed reports (e.g., daily summary) as cached results updated periodically.

---

### 8. Settlement Logic Queries Each Bet Individually — ⚠️ UNFIXED

**File:** `controllers/operator/operator.controller.js` (`createResult`, lines 250–457)

**Problem:**
The settlement process in `createResult` loops through bets and bet results one at a time:
```
For each bet in round:
  Load user (with row lock)
  For each betResult in bet:
    Create Transaction
    Update BetResult
    Update User balance
```

With 50 players having 3 bets each, this creates 150+ individual UPDATE and INSERT statements within a single transaction, holding row locks for the entire duration.

**Fix:**
- Batch the bet result updates using `BetResult.update({ ... }, { where: { id: winnerIds } })`.
- Compute all balance changes first, then apply them in bulk.
- Consider using a stored procedure for settlement to reduce round-trip overhead.

---

## Priority Order for Fixes

| Priority | Issue # | Effort | Impact |
|----------|---------|--------|--------|
| 1st | #2 — Add database indexes | Low | Improves ALL query performance |
| 2nd | #1 — Fix N+1 in getDesks | Medium | Lobby load time (every player) |
| 3rd | #3 — Cache totalBalance | Medium | Auth response time (every admin request) |
| 4th | #5 — Configure connection pool | Low | Prevents connection exhaustion |
| 5th | #8 — Batch settlement queries | High | Settlement speed under load |
| 6th | #7 — Optimize report queries | High | Report page load times |
| 7th | #4 — Split GET/POST for game infos | Medium | Prevents accidental state mutation |
| 8th | #6 — Fix serial number generation | Low | Prevents duplicate serials |
