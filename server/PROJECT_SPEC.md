# Kinpo Server - Project Specification

## 1. Project Overview

**Kinpo Server** is the backend for a live casino gaming platform. It serves three portals — User (player), Admin (back-office), and Operator (dealer) — through REST APIs and real-time Socket.IO events. Data is persisted in MySQL via Sequelize ORM. The server handles authentication, game session management, betting, result processing, and administrative operations.

> For the client-side specification, see [`client/PROJECT_SPEC.md`](../client/PROJECT_SPEC.md).

---

## 2. Tech Stack

### Runtime & Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | — | JavaScript runtime |
| Express | ^5.1.0 | HTTP framework |
| Socket.IO | ^4.8.1 | Real-time bidirectional events |

### Database & ORM

| Technology | Version | Purpose |
|------------|---------|---------|
| MySQL | — | Relational database |
| mysql2 | ^3.15.3 | MySQL driver |
| Sequelize | ^6.37.7 | ORM with migrations and seeders |

### Security & Middleware

| Technology | Version | Purpose |
|------------|---------|---------|
| jsonwebtoken | ^9.0.2 | JWT generation and verification |
| bcryptjs | ^3.0.3 | Password hashing |
| helmet | ^8.1.0 | Security HTTP headers |
| cors | ^2.8.5 | Cross-origin resource sharing |
| express-rate-limit | ^8.2.1 | Request rate limiting |

### Validation & Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| Joi | ^18.0.1 | Request body/param validation |
| dotenv | ^17.2.3 | Environment variable loading |
| morgan | ^1.10.1 | HTTP request logging |
| compression | ^1.8.1 | Response compression |
| colors | ^1.4.0 | Colored console output |
| body-parser | ^2.2.0 | Request body parsing |

### Development

| Technology | Version | Purpose |
|------------|---------|---------|
| nodemon | ^3.1.11 | Auto-restart on file changes |
| sequelize-cli | ^6.6.3 | Migration and seeder CLI |

---

## 3. Directory Structure

```
server/
├── server.js                  # Entry point — Express app, Socket.IO, middleware, routes
├── config/
│   └── config.json            # Sequelize DB config (dev / test / production)
├── controllers/
│   ├── admin/                 # Admin controllers (22 files)
│   │   ├── announce.controller.js
│   │   ├── auth.controller.js
│   │   ├── bet-result.controller.js
│   │   ├── bet.controller.js
│   │   ├── camera.controller.js
│   │   ├── desk.controller.js
│   │   ├── game.controller.js
│   │   ├── gameRound.controller.js
│   │   ├── gameSession.controller.js
│   │   ├── login-info.controller.js
│   │   ├── operation-log.controller.js
│   │   ├── rate-limit.controller.js
│   │   ├── recalculate.controller.js
│   │   ├── result.controller.js
│   │   ├── role.controller.js
│   │   ├── roundResult.controller.js
│   │   ├── scanner.controller.js
│   │   ├── user-rate-limit.controller.js
│   │   └── user.controller.js
│   ├── operator/              # Operator controllers
│   │   ├── auth.controller.js
│   │   └── operator.controller.js
│   └── user/                  # User (player) controllers
│       ├── auth.controller.js
│       └── user.controller.js
├── middleware/
│   └── auth.middleware.js     # JWT verification + role-based access
├── models/                    # Sequelize model definitions (27 files)
│   ├── index.js               # Model loader and association setup
│   ├── user.js
│   ├── role.js
│   ├── game.js
│   ├── desk.js
│   ├── camera.js
│   ├── scanner.js
│   ├── gamesession.js
│   ├── gameround.js
│   ├── gameroundhistory.js
│   ├── result.js
│   ├── roundresult.js
│   ├── roundresulthistory.js
│   ├── bet.js
│   ├── betresult.js
│   ├── betresulthistory.js
│   ├── niuniuround.js
│   ├── niuniuroundhistory.js
│   ├── niuniuplayerhand.js
│   ├── niuniuplayerhandhistory.js
│   ├── ratelimit.js
│   ├── resultratelimit.js
│   ├── userratelimit.js
│   ├── transaction.js
│   ├── announce.js
│   ├── loginInfo.js
│   └── operationlog.js
├── routes/
│   ├── admin/                 # Admin route definitions (19 files)
│   │   ├── index.js
│   │   ├── announce.routes.js
│   │   ├── auth.routes.js
│   │   ├── bet-result.routes.js
│   │   ├── bet.routes.js
│   │   ├── camera.routes.js
│   │   ├── desk.routes.js
│   │   ├── game.routes.js
│   │   ├── gameRound.routes.js
│   │   ├── gameSession.routes.js
│   │   ├── login-info.routes.js
│   │   ├── operation-log.routes.js
│   │   ├── rate-limit.routes.js
│   │   ├── recalculate.routes.js
│   │   ├── result.routes.js
│   │   ├── role.routes.js
│   │   ├── roundResult.routes.js
│   │   ├── scanner.routes.js
│   │   └── user-rate-limit.routes.js
│   ├── operator/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   └── operator.routes.js
│   └── user/
│       ├── index.js
│       ├── auth.routes.js
│       └── user.routes.js
├── socket/
│   ├── index.js               # Socket.IO connection handler
│   ├── game.socket.js         # Game event relay (no auth)
│   └── scanner.socket.js      # Scanner events (token-authenticated)
├── utils/
│   ├── common.js              # Shared helpers (getTotalBalance, getUpperestAgentData, etc.)
│   ├── jwt.js                 # JWT sign/verify utilities
│   └── response.js            # Standardized API response helpers
├── validations/               # Joi validation schemas (13 files)
│   ├── user.validation.js
│   ├── camera.validation.js
│   ├── desk.validation.js
│   ├── game.validation.js
│   ├── result.validation.js
│   ├── bet.validation.js
│   ├── betResult.validation.js
│   ├── gameRound.validation.js
│   ├── gameSession.validation.js
│   ├── roundResult.validation.js
│   ├── scanner.validation.js
│   ├── role.validation.js
│   └── login-info.validation.js
├── migrations/                # Sequelize migrations (26 files, Nov 2025 – Feb 2026)
├── seeders/                   # Seed data (10 files: roles, users, games, desks, results, etc.)
├── .env                       # Environment variables (not committed)
├── package.json
└── package-lock.json
```

---

## 4. Request Pipeline

```
Client Request
  │
  ▼
Express
  ├── helmet()                         # Security headers
  ├── compression()                    # Gzip response compression
  ├── morgan("dev")                    # HTTP request logging
  ├── cors({ origin, credentials })    # CORS with CLIENT_URL origin
  ├── express.json({ limit: "10mb" }) # JSON body parsing
  ├── express.urlencoded()             # URL-encoded body parsing
  │
  ├── /api/auth/*                      # ← No auth middleware (public)
  │     ├── adminAuthRoute
  │     ├── operatorAuthRoute
  │     └── userAuthRoute
  │
  ├── /api/admin/*                     # ← authMiddleware (protected)
  │     └── adminRoute
  ├── /api/operator/*                  # ← authMiddleware (protected)
  │     └── operatorRoute
  ├── /api/user/*                      # ← authMiddleware (protected)
  │     └── userRoute
  │
  └── Global error handler             # Catches unhandled errors → JSON response
```

---

## 5. Authentication & Authorization

### JWT Flow

1. Client sends credentials to `/api/auth/login`, `/api/auth/operator_login`, or `/api/auth/player_login`.
2. Server validates credentials (bcrypt compare), generates a JWT containing `{ id, token_version }`, and returns it.
3. Client includes the token in subsequent requests: `Authorization: Bearer <token>`.
4. `auth.middleware.js` intercepts protected routes, verifies the JWT, loads the user + role from the database, and attaches `req.user`.

### Auth Middleware Logic (`middleware/auth.middleware.js`)

| Step | Action |
|------|--------|
| 1 | Extract `Bearer` token from `Authorization` header |
| 2 | `jwt.verify()` with `JWT_SECRET` |
| 3 | Load `User` with associated `Role` |
| 4 | Check `token_version` matches (single-session enforcement) |
| 5 | Role-specific checks (see below) |
| 6 | Set response headers: `x-user-balance`, `x-user-total-balance`, `x-user-permission` |

### Role-Based Rules

| Role | Checks |
|------|--------|
| **agent** | `state === "normal"` and `locking === "normal"`; returns balance and permission in headers |
| **sub_account** | `state === "online"`, parent agent must be normal/unlocked; validates `x-client-page` header against `permission` list |
| **developer** | Loads uppermost agent's balance and permission |
| **member** | Standard token check; on `TokenExpiredError` sets `login_flg = false` |

### Token Invalidation

- Mismatched `token_version` → 401 `TOKEN_INVALID` (forces re-login when account logs in elsewhere)
- Expired token → 401 `TOKEN_INVALID`; for members, also clears `login_flg`
- Missing/invalid token → 401 `TOKEN_INVALID`

---

## 6. API Route Summary

### Authentication (`/api/auth`) — No auth middleware

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Admin login |
| POST | `/auth/operator_login` | Operator login (includes desk assignment) |
| POST | `/auth/player_login` | Player login |
| POST | `/auth/player_logout` | Player logout |

### Admin Portal (`/api/admin`) — Protected

| Prefix | Resource | Operations |
|--------|----------|------------|
| `/admin/announce` | Announcements | CRUD |
| `/admin/roles` | Roles | Read |
| `/admin/users` | Users | List, create, update, status, password, limits |
| `/admin/desks` | Desks | CRUD |
| `/admin/cameras` | Cameras | CRUD |
| `/admin/scanners` | Scanners | CRUD |
| `/admin/games` | Games | Read |
| `/admin/results` | Results | Read, create |
| `/admin/rate_limits` | Rate limits | CRUD |
| `/admin/user_rate_limits` | Per-user rate limits | CRUD |
| `/admin/game_sessions` | Game sessions | Read |
| `/admin/game_rounds` | Game rounds | Read |
| `/admin/round_results` | Round results | Read |
| `/admin/bet_results` | Bet results + reports | Code lookup, summary, daily, online players |
| `/admin/bets` | Bets | Read |
| `/admin/recalculates` | Recalculation | Trigger result recalculation |
| `/admin/operation_logs` | Operation logs | Read, create |
| `/admin/login_infos` | Login info/history | Read, create |

### Operator Portal (`/api/operator`) — Protected

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/operator/desks/:id` | Fetch assigned desk info |
| GET | `/operator/game_infos/:id` | Fetch game configuration |
| POST | `/operator/results` | Submit round result (Baccarat/Longhu) |
| POST | `/operator/niuniu_results` | Submit round result (Niuniu) |
| POST | `/operator/finish_game_session/:desk_id` | End game session |
| POST | `/operator/invalid_game` | Invalidate a round |
| POST | `/operator/confirm_account` | Verify operator identity |

### User Portal (`/api/user`) — Protected

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/user/games` | Available games |
| GET | `/user/desks` | Game desks with session data |
| GET | `/user/cameras` | Camera stream URLs |
| GET | `/user/users/:id` | Player info and balance |
| GET | `/user/results_by_desk/:desk_id` | Historical results (roadmap) |
| GET | `/user/last_round_status/:desk_id` | Current round status |
| GET | `/user/niuniu_results/:desk_id` | Niuniu-specific results |
| GET | `/user/confirm_bets/:last_round` | Confirmed bets for round |
| POST | `/user/bet_results` | Place bets |
| PUT | `/user/bet_results` | Update bet results (settle) |
| POST | `/user/cancle_bet_results` | Cancel bets |
| PUT | `/user/bet_keys` | Update bet key mapping |
| PUT | `/user/game_rounds/:id` | Update round status |
| GET | `/user/user_bet_results` | Bet history summary |
| GET | `/user/user_bet_results/detail` | Bet details by date |
| GET | `/user/user_bet_results/detail/cards` | Result cards by round |
| GET | `/user/transactions` | Transaction history |

---

## 7. Socket.IO

### Connection

Socket.IO runs on the same HTTP server as Express. CORS is configured to accept connections from `CLIENT_URL`. The default namespace (`/`) is used for all events.

```
Client connects → io.on("connection") → registers game + scanner event handlers
```

### Game Events (`socket/game.socket.js`)

Uses `socket.onAny()` to relay events by pattern-matching event names. **No authentication is performed** — see [SECURITY_FIXES.md](./SECURITY_FIXES.md) issue #3.

| Inbound Event (Client → Server) | Outbound Event (Server → All) | Purpose |
|----------------------------------|-------------------------------|---------|
| `desk:{id}:startTimer` | `desk:{id}:updateTimer` | Start betting countdown |
| `desk:{id}:status` | `desk:{id}:updateStatus` | Change round status |
| `desk:{id}:result` | `desk:{id}:updateResult` | Broadcast round result |
| `desk:{id}:dealCard` | `desk:{id}:dealCard` | Deal a card |
| `desk:{id}:deleteLastCard` | `desk:{id}:deleteLastCard` | Undo last card |
| `desk:{id}:finish-session` | `desk:{id}:finish-session` | End game session |
| `desk:{id}:user:{userId}:net-amount` | `desk:{id}:user:{userId}:net-amount` | Player net amount update |
| `desk:{id}:invalid-game` | `desk:{id}:invalid-game` | Invalidate round |
| `online_player:{id}:logout` | `online_player:force_logout` | Force-logout a player |
| `user_announcement:{id}:change` | `user_announcement:change` | Push announcement |
| `member_topup:{id}:change` | `member_topup:change` | Balance change notification |

### Scanner Events (`socket/scanner.socket.js`)

Authenticated via `SCANNER_TOKEN` in the handshake.

| Inbound Event | Outbound Event | Purpose |
|---------------|----------------|---------|
| `scanner:scan` | `desk:{desk_no}:rawScan` | Forward scanned card data to desk |

Authentication check:
```
socket.handshake.auth.token === process.env.SCANNER_TOKEN
```
Unauthorized attempts are logged and silently dropped.

---

## 8. Configuration

### Sequelize (`config/config.json`)

| Environment | Database | Host | Notes |
|-------------|----------|------|-------|
| development | `kinpo_development` | `127.0.0.1` | Password: `null` |
| test | `kinpo_test` | `127.0.0.1` | Password: `null` |
| production | `kinpo_production` | `127.0.0.1` | Password hardcoded — see [SECURITY_FIXES.md](./SECURITY_FIXES.md) #1 |

All environments use `mysql` dialect with `+06:30` timezone.

### Environment Variables (`.env`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | Recommended | `development` / `production` |
| `PORT` | No (default `3001`) | HTTP server port |
| `CLIENT_URL` | Yes | Allowed CORS origin |
| `JWT_SECRET` | Yes | Secret for signing/verifying JWTs |
| `SCANNER_TOKEN` | Yes | Static token for scanner socket authentication |
| `DB_PASSWORD` | Recommended | Production DB password (if migrated from config.json) |

> **Note:** Required env vars are not validated at startup — see [SECURITY_FIXES.md](./SECURITY_FIXES.md) #5.

---

## 9. Database Models

### Core Entities

| Model | Table | Key Fields | Associations |
|-------|-------|------------|--------------|
| Role | roles | `id`, `name` | hasMany User |
| User | users | `id`, `account`, `password`, `role_id`, `state`, `locking`, `balance`, `token_version`, `permission`, `creator_account`, `login_flg` | belongsTo Role; hasMany UserRateLimit |
| Game | games | `id`, `name`, `type` (BACCARAT / LONGHU / NIUNIU) | hasMany Desk, Result, RateLimit |
| Desk | desks | `id`, `game_id`, `name`, `desk_no`, `baccarat_type`, `position` | belongsTo Game; hasMany Camera, Scanner, GameSession |
| Camera | cameras | `id`, `desk_id`, `camera_no`, `position`, `url`, `status` | belongsTo Desk |
| Scanner | scanners | `id`, `name`, `desk_id`, `com_port`, `serial_number`, `position` | belongsTo Desk |

### Game Flow Entities

| Model | Table | Key Fields |
|-------|-------|------------|
| GameSession | game_sessions | `id`, `desk_id`, `user_id`, `session_no`, `status`, `start_time`, `end_time` |
| GameRound | game_rounds | `id`, `session_id`, `round_no`, `status`, `cards` |
| GameRoundHistory | game_round_histories | Mirror of GameRound for audit |
| RoundResult | round_results | `id`, `game_round_id`, `result_id`, ... |
| RoundResultHistory | round_result_histories | Mirror of RoundResult for audit |
| NiuniuRound | niuniu_rounds | Niuniu-specific round data |
| NiuniuPlayerHand | niuniu_player_hands | Niuniu player hand data |
| NiuniuRoundHistory | niuniu_round_histories | Audit mirror |
| NiuniuPlayerHandHistory | niuniu_player_hand_histories | Audit mirror |

### Betting & Finance Entities

| Model | Table | Key Fields |
|-------|-------|------------|
| Bet | bets | Bet configuration |
| BetResult | bet_results | `id`, `user_id`, `round_id`, `result_id`, `amount`, `win_lose`, ... |
| BetResultHistory | bet_result_histories | Audit mirror |
| Transaction | transactions | `id`, `user_id`, `type`, `amount`, `before_amount`, `after_amount` |
| Result | results | `id`, `game_id`, `key`, `name`, `ratio`, `position`, `baccarat_type` |

### Configuration Entities

| Model | Table | Key Fields |
|-------|-------|------------|
| RateLimit | rate_limits | `id`, `game_id`, `min_bet`, `max_bet` |
| ResultRateLimit | result_rate_limits | Per-result rate limit mapping |
| UserRateLimit | user_rate_limits | Per-user rate limit override |

### System Entities

| Model | Table | Key Fields |
|-------|-------|------------|
| Announce | announces | `id`, `content`, `status` |
| LoginInfo | login_infos | `id`, `user_id`, `ip_address`, `equipment`, `browser` |
| OperationLog | operation_logs | `id`, `user_id`, `action`, `details` |

---

## 10. Validation

Joi schemas in `validations/` are used by controllers to validate request bodies. Each controller calls `schema.validate(req.body)` and returns a 400-level response on failure.

| Schema File | Validates |
|-------------|-----------|
| `user.validation.js` | User creation, update, status change, password change |
| `camera.validation.js` | Camera CRUD |
| `desk.validation.js` | Desk CRUD |
| `game.validation.js` | Game data |
| `result.validation.js` | Result entries |
| `bet.validation.js` | Bet configuration |
| `betResult.validation.js` | Bet result submission |
| `gameRound.validation.js` | Game round status updates |
| `gameSession.validation.js` | Game session data |
| `roundResult.validation.js` | Round result entries |
| `scanner.validation.js` | Scanner CRUD |
| `role.validation.js` | Role data |
| `login-info.validation.js` | Login info queries |

---

## 11. Security Considerations

| Area | Status | Details |
|------|--------|---------|
| Auth middleware | Active | JWT verification + `token_version` for single-session enforcement |
| Role-based access | Active | Role checks in `auth.middleware.js` (agent, sub_account, developer, member) |
| Sub-account permissions | Active | `x-client-page` header validated against `permission` field |
| Helmet | Active | Security headers (X-Frame-Options, HSTS, etc.) |
| CORS | Active | Restricted to `CLIENT_URL` origin |
| Rate limiting | **Disabled** | Auth rate limiter commented out — see [SECURITY_FIXES.md](./SECURITY_FIXES.md) #2 |
| Socket.IO auth | **Missing** | Game events have no authentication — see [SECURITY_FIXES.md](./SECURITY_FIXES.md) #3 |
| Config secrets | **Exposed** | Production DB password in repo — see [SECURITY_FIXES.md](./SECURITY_FIXES.md) #1 |
| Env validation | **Missing** | No startup check for required env vars — see [SECURITY_FIXES.md](./SECURITY_FIXES.md) #5 |
| Error handling | Partial | Returns `err.message` in all environments — see [SECURITY_FIXES.md](./SECURITY_FIXES.md) #6 |

For the full vulnerability list and remediation steps, see [`SECURITY_FIXES.md`](./SECURITY_FIXES.md).

---

## 12. Scripts & Running

### npm Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server with nodemon auto-reload |
| `npm run sequelize` | Run Sequelize CLI (migrations, seeders) |
| `npm test` | Placeholder (not implemented) |

### Common Sequelize CLI Commands

```bash
npx sequelize db:migrate          # Run pending migrations
npx sequelize db:migrate:undo     # Revert last migration
npx sequelize db:seed:all         # Run all seeders
npx sequelize db:seed:undo:all    # Revert all seeders
```

### Running

- **Entry point:** `server.js`
- **Default port:** `3001` (overridable via `PORT` env var)
- **Prerequisites:** MySQL running, `.env` configured, migrations applied
- **Start:** `npm run dev` (development) or `node server.js` (production)

The server starts both the Express HTTP server and Socket.IO on the same port.
