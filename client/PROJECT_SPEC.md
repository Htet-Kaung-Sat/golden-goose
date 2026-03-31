# Kinpo Client - Project Specification

> For the server-side specification, see [`server/PROJECT_SPEC.md`](../server/PROJECT_SPEC.md).

## 1. Project Overview

**Kinpo** is a live casino gaming platform built as a single-page application (SPA). It provides three distinct portals:

- **User Portal** -- Player-facing interface for live game streaming, betting, and account management.
- **Admin Portal** -- Back-office for platform administration including user management, game configuration, reporting, and system monitoring.
- **Operator Portal** -- Dealer-facing interface for managing live game sessions, entering results, and controlling game flow.

The platform supports three card game types:

| Game | Variants | Description |
|------|----------|-------------|
| Baccarat | N (Normal), G (Grand), B (Basic) | Classic casino card game with Banker/Player betting |
| Longhu (Dragon Tiger) | Single variant | Simplified card game with Dragon/Tiger betting |
| Niuniu (Bull Bull) | Single variant | Chinese card game with Banker vs up to 3 Players |

---

## 2. Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.0.0 | UI framework |
| TypeScript | ~5.7.2 | Type safety |
| Vite | ^6.2.0 | Build tool with HMR |
| React Router | ^7.4.1 | Client-side routing |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | ^4.1.1 (v4) | Utility-first CSS |
| Radix UI | Various | Accessible UI primitives |
| Lucide React | ^0.487.0 | Icon library |
| Iconify | ^6.0.2 | Additional icons |
| Framer Motion | ^12.6.3 | Animations |
| class-variance-authority | ^0.7.1 | Component variant management |
| tw-animate-css | ^1.2.5 | Tailwind animation utilities |

### Data & Forms

| Technology | Version | Purpose |
|------------|---------|---------|
| React Hook Form | ^7.56.0 | Form state management |
| Yup | ^1.7.1 | Schema validation |
| TanStack React Table | ^8.21.2 | Data tables |
| Axios | ^1.8.4 | HTTP client |
| Socket.IO Client | ^4.8.1 | Real-time WebSocket communication |

### Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| dayjs | ^1.11.19 | Date formatting and manipulation |
| i18next | ^25.7.3 | Internationalization |
| ExcelJS / xlsx-js-style | ^4.4.0 / ^1.2.0 | Excel export |
| next-themes | ^0.4.6 | Theme management (light/dark) |
| Sonner | ^2.0.3 | Toast notifications |
| react-select | ^5.10.2 | Enhanced select inputs |

---

## 3. Architecture

### Application Structure

```
src/
├── api/                    # API layer (Axios calls)
│   ├── axios.ts            # Base Axios instance + interceptors
│   ├── admin/              # Admin API endpoints (18 files)
│   ├── user/               # User API endpoints
│   └── operator/           # Operator API endpoints
├── assets/
│   └── css/                # Custom CSS files
├── components/
│   ├── errors/             # Error pages (404)
│   ├── loading/            # Loading spinners and page loaders
│   ├── roadmaps/           # Game roadmap displays (Big Road, etc.)
│   ├── shared/             # Reusable shared components
│   └── ui/                 # Radix UI primitives + custom UI
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── layouts/                # Portal layout wrappers
│   ├── admin/              # Admin layout (sidebar + navbar)
│   ├── operator/           # Operator layout
│   └── user/               # User layout (auth guard)
├── lib/                    # Core utilities (cn, socket)
├── locales/                # i18n translation files (en.json, zh.json)
├── pages/
│   ├── admin/              # Admin portal pages (~30 pages)
│   ├── operator/           # Operator portal pages
│   └── user/               # User portal pages
├── types/                  # TypeScript type definitions (12 files)
├── utils/                  # Helper utilities
└── validation/             # Yup validation schemas (12 files)
```

### Routing Architecture

All routes are defined in `App.tsx` using React Router v7 `createBrowserRouter`. Components are lazy-loaded with `React.lazy()` wrapped in a `LazyRoute` component providing Suspense fallback.

```
/                           → User Portal (auth-protected)
  /login                    → Player Login
  /                         → Home (game lobby)

/operator                   → Operator Portal
  /operator/login           → Operator Login
  /operator                 → Operator Home (game-type dependent)

/admin                      → Admin Portal
  /admin/login              → Admin Login
  /admin                    → Dashboard
  /admin/user_management/*  → User management (nested)
  /admin/desks/*            → Desk CRUD
  /admin/cameras/*          → Camera CRUD
  /admin/scanners/*         → Scanner CRUD
  /admin/*_report           → Report pages
  /admin/operation_log      → Audit log
  ... (54 routes total)
```

### Real-Time Communication

Socket.IO is used for live game state synchronization:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `desk:{id}:updateTimer` | Server → Client | Betting countdown timer |
| `desk:{id}:updateStatus` | Server → Client | Game round status changes |
| `member_topup:change` | Server → Client | Balance update notification |
| `user_announcement:change` | Server → Client | New announcement push |
| Force logout events | Server → Client | Session invalidation |

Socket configuration:
- Development: connects to `VITE_API_BASE_URL` with polling + websocket transports
- Production: connects to same origin with `/socket.io` path, websocket + polling transports

### Authentication Flow

```
Login → API returns token → Stored in localStorage → Attached via Axios interceptor
  ↓
Axios response interceptor:
  - 401 TOKEN_INVALID → Global logout (clear storage, redirect to portal login)
  - 403 PROHIBITED_ACCESS → Permission denied
  - 403 ILLEGAL_ACCESS → Illegal access
  - Success → Extract balance/permission data
```

Storage keys: `token`, `playerID`, `account`, `name`, `loginUser`, `rememberedAccount`, `pendingBets`

Session cleanup: `beforeunload` event sends beacon to `/api/auth/player_logout` and clears localStorage.

---

## 4. User Portal

### 4.1 Login Page (`/login`)

**Purpose:** Player authentication.

**UI Elements:**
- Account input field
- Password input with show/hide toggle
- "Remember Account" checkbox (persists account in localStorage)
- "I Agree" checkbox linking to Terms & Conditions
- Online customer service link
- Version label: "PC Version 2.64-W"

**API:** `POST /auth/player_login` with `{ account, password, equipment, browser, ip_address }`

**Flow:** Login success → store token, account, name, playerID → navigate to Home.

### 4.2 Home Page (`/` index)

**Purpose:** Game lobby for browsing and selecting game tables.

**Layout (three-panel):**

| Section | Content |
|---------|---------|
| **Top bar** | Announcement marquee (clickable popup), Report, Help, Fullscreen, Settings, Agreement, Logout buttons |
| **Left sidebar** | Logo, user account + balance, refresh button, game filter buttons (All / Baccarat / Longhu / Niuniu), Multiple Bet toggle, date/time, Online Customer Service link |
| **Center** | Grid of desk cards filtered by selected game type; each card shows desk name, game type, session info, roadmap preview |
| **Right panel** | Live CCTV stream (home cameras), camera swap button, promotional image |

**APIs:**
- `GET /user/games` -- available games
- `GET /user/desks` -- game tables with session/result data
- `GET /user/cameras` -- camera stream URLs
- `GET /user/users/{id}` -- player balance and info
- `GET /admin/announce` -- user announcements
- `POST /auth/player_logout` -- logout

**Real-time:** Socket listeners for `member_topup:change` (balance updates), `user_announcement:change` (new announcements).

### 4.3 GamePlayer Page

**Purpose:** Live game view for a selected desk with video streaming and betting.

**Layout (full-screen):**

| Section | Content |
|---------|---------|
| **Video area** | Full-screen camera stream with swap camera button |
| **Top-right controls** | Toggle info panel, Report, Help, Fullscreen, Settings, Back to lobby |
| **Info panel** | Room name, session/round number, betting limits, balance, total bets |
| **Bottom** | Game-specific result table (roadmap) + betting board |
| **Status indicator** | Timer/countdown for betting window, dealing phase, payout phase |

**Game Components per Type:**

| Game | Result Table | Betting Board | Card Board |
|------|-------------|---------------|------------|
| Baccarat N/G/B | Baccarat roadmaps (Big Road, Big Eye, Small, Cockroach) | Banker/Player/Tie/Pairs betting areas | Card reveal animation |
| Longhu | Longhu roadmap | Dragon/Tiger/Tie betting areas | Card reveal animation |
| Niuniu | Niuniu road | Banker vs Player1/2/3 betting areas | Niu-value card board |

**APIs:**
- `GET /user/last_round_status/{desk_id}` -- current round status
- `GET /user/results_by_desk/{desk_id}` -- historical results for roadmap
- `GET /user/niuniu_results/{desk_id}` -- Niuniu-specific results
- `GET /user/confirm_bets/{last_round}` -- confirmed bets for current round
- `POST /user/bet_results` -- place bets
- `PUT /user/bet_results` -- update bet results (win/lose)
- `POST /user/cancle_bet_results` -- cancel bets
- `PUT /user/bet_keys` -- update bet key mapping

**Real-time:** Socket `desk:{id}:updateTimer`, `desk:{id}:updateStatus`

### 4.4 MultipleBet Page

**Purpose:** Simultaneous multi-table betting interface.

**Layout:**
- Horizontal scrollable row of desk cards (each with mini video stream, betting board, expand/close)
- "Add desk" button opens right-side panel with available desks
- Right panel: game type filter (All / Baccarat / Longhu), scrollable desk list
- Bottom: shared coin selection board for bet amounts

**Behavior:** Players can add multiple desks and place bets across all of them simultaneously. Each desk card can be expanded for a detailed view.

### 4.5 Dialogs

#### ReportDialog
Four tabs:
1. **Bet Report** -- date filter (Today/Yesterday/7 days), summary table (total bet, win/loss, commission), drill-down to detailed bet history and game result cards
2. **Transaction Record** -- paginated list of deposits/withdrawals/settlements with amounts and balance
3. **Personal Profile** -- account info display, wash code settings, betting limits per game
4. **Change Password** -- new password input with validation (6-32 chars, alphanumeric)

#### HelpDialog
Accordion-based game rules organized by tabs:
- Baccarat rules, betting guide, card drawing rules, odds
- Longhu rules, betting guide, odds
- Niuniu rules, hand rankings, multiplier table
- Road Introduction (Big Road, Big Eye Road, Small Road, Cockroach Road, Ask Road)
- Good Road patterns (Long Dragon, One Room Two Halls, Single Jump, Double Jump, Dragon Dotting)

#### SettingsDialog
- Music track selector: Classical, Lyrical, Nature, Nostalgia, Romantic
- Language selector: Mandarin, English, Cantonese
- Toggles: Background music ON/OFF, Game sound effects ON/OFF

#### AgreementDialog
- Scrollable Terms & Conditions (16 clauses covering account security, betting rules, dispute resolution)

### 4.6 GamePlayerRightSideDesks
- Slide-out panel accessible from GamePlayer view
- Toggle button on right edge
- Game type filter buttons (All / Baccarat / Longhu / Niuniu)
- Scrollable desk list; click desk to switch active game

---

## 5. Admin Portal

### 5.1 Login (`/admin/login`)

**UI:** Account/password inputs, remember me, error/success dialogs.

**API:** `POST /auth/login` with `{ account, password, equipment, browser, ip_address }`

### 5.2 Dashboard (`/admin`)

**Role-dependent content:**

| Role | Content |
|------|---------|
| Agent | Announcement management table (CRUD with inline editing) |
| Admin | Member Overview (cumulative + today registrations), Flow Overview (deposits/withdrawals count + amounts) |

### 5.3 Personnel Management

| Page | Route | Features |
|------|-------|----------|
| Personnel Management | `/admin/personnel_management` | Search users by account/name, filter by state/role, paginated list |
| Basic Information | `/admin/user_management/basic_information` | View user details |
| New User | `/admin/user_management/new_user` | Create agent or member accounts |
| Agent List | `/admin/user_management/agent` | Agent hierarchy management |
| Member List | `/admin/user_management/member` | Member list with actions |
| Top Up | `/admin/user_management/member/:id/topup` | Adjust user balance |
| Modify Status | `.../modify_status` | Lock/unlock user accounts |
| Change Password | `.../change_password` | Reset user passwords |
| Bet Limit Config | `.../bet_limit_config` | Configure per-user betting limits |
| Auto Settle Wash Code | `.../auto_settle_wash_code` | Configure wash code auto-settlement |
| Auto Settle Rebate | `.../auto_settle_rebate` | Configure rebate auto-settlement |
| Change Name | `.../change_name` | Update user nickname |
| Update Info | `.../update_info` | Update user information |
| User Search | `/admin/user_search` | Global user search with same management actions |
| Online Players | `/admin/online_player` | Currently online player list |
| Player Login Log | `/admin/player_login_log` | Login history audit trail |
| Account Information | `/admin/account_information` | Admin account info display |

### 5.4 Game Management

| Page | Route | Features |
|------|-------|----------|
| Desk Management | `/admin/desks` | CRUD for game tables (name, game type, baccarat variant, desk number, position) |
| Camera Management | `/admin/cameras` | CRUD for cameras (desk assignment, camera number, position, stream URL, status) |
| Scanner Management | `/admin/scanners` | CRUD for card scanners (name, desk assignment, COM port, serial number, position) |
| Rate Limit Management | `/admin/rate_limit_management` | Configure betting limits per game (min/max bet amounts) |
| Result Change | `/admin/result_change` | Modify game results post-round |
| Recalculate | `/admin/recalculate` | Recalculate bet payouts after result corrections |
| Developer User Management | `/admin/developer_user_management` | Manage developer test accounts |

### 5.5 Report Management

| Page | Route | Features |
|------|-------|----------|
| Code Lookup | `/admin/code_lookup` | Search bet records by code |
| Summary Report | `/admin/summary_report` | Aggregated summary statistics |
| Tabletop Report | `/admin/tabletop_report` | Per-table performance reports |
| Boot Report | `/admin/boot_report` | Game session boot reports |
| Daily Report | `/admin/daily_report` | Daily betting reports with date range filter and account search |

### 5.6 System Management

| Page | Route | Features |
|------|-------|----------|
| Operation Log | `/admin/operation_log` | System audit log of admin actions |
| Change Password | `/admin/change_password` | Change own admin password |
| Sub Account | `/admin/sub_account` | Manage sub-administrator accounts with permission scoping |

### 5.7 Other

| Page | Route | Features |
|------|-------|----------|
| User Announcement | `/admin/user_announcement` | Manage announcements shown to players |
| Customer Service | `/admin/customer_service` | External customer service link |

---

## 6. Operator Portal

### 6.1 Login (`/operator/login`)

**UI:** Account, password, and desk number inputs.

**API:** `POST /auth/operator_login` with `{ account, password, desk_no }`

### 6.2 Home (`/operator`)

**Purpose:** Dealer-facing interface for managing live game sessions.

**Layout:** Fixed 1920x1080 with responsive viewport scaling.

**Behavior:** Renders game-specific operator interface based on the desk's assigned game type:

| Game | Component | Features |
|------|-----------|----------|
| Baccarat N | `operator/baccarat_n/` | Card input, result entry, round management |
| Baccarat G | `operator/baccarat_g/` | Card input, result entry, round management |
| Baccarat B | `operator/baccarat_b/` | Card input, result entry, round management |
| Longhu | `operator/longhu/` | Card input, result entry, round management |
| Niuniu | `operator/niuniu/` | Multi-player card input, niu-value calculation |

**APIs:**
- `GET /operator/desks/{id}` -- fetch desk info
- `GET /operator/game_infos/{id}` -- fetch game configuration
- `POST /operator/results` -- submit round results (Baccarat/Longhu)
- `POST /operator/niuniu_results` -- submit round results (Niuniu)
- `PUT /user/game_rounds/{id}` -- update round status
- `POST /operator/finish_game_session/{desk_id}` -- end game session
- `POST /operator/invalid_game` -- invalidate a round
- `POST /operator/confirm_account` -- verify operator identity

---

## 7. Data Models

### Core Entities

```typescript
type User = {
  id?: number;
  role_id?: number;
  role?: Role;
  userRateLimits?: UserRateLimit[];
  account?: string;
  login_id?: number;
  login_account?: string;
  dev_account?: boolean;
  creator_account?: string;
  level?: number;
  name?: string;
  nick_name?: string;
  password?: string;
  login_password?: string;
  state?: string;
  locking?: string;
  balance?: number;
  total_balance?: number;
  bonus_type?: string;
  bonus_rate?: number;
  display_bonus?: boolean;
  share_type?: string;
  share_rate?: number;
  permission?: string;
  day_limit?: number;
  is_subaccount?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Desk = {
  id: number;
  game_id: number;
  name: string;
  game: Game;
  baccarat_type: string;
  desk_no: string;
  position: number;
  last_round: GameRound;
  session: GameSession;
  results: RoundResult[];
};

type Game = {
  id: number;
  name: string;
  type: "NIUNIU" | "BACCARAT" | "LONGHU";
  results: Result[];
};

type GameSession = {
  id: number;
  desk_id: number;
  user_id: number;
  session_no: string;
  status: string;
  start_time: string;
  end_time: string;
};

type GameRound = {
  id: number;
  session_id: number;
  round_no: string;
  status: string;
  cards?: BaccaratCards | NiuniuCards | LonghuCards;
};

type Result = {
  id?: number;
  game_id?: number;
  baccarat_type?: string;
  position?: number;
  key: string;
  name?: string;
  isGuess?: boolean;
  ratio?: number;
  game?: Game;
};

type RateLimit = {
  id: number;
  game_id: number;
  game?: Game;
  min_bet: number;
  max_bet: number;
};

type Camera = {
  id: number;
  desk_id: number;
  desk?: Desk;
  camera_no: string;
  position: number;
  url: string;
  status: string;
};

type Scanner = {
  id: number;
  name: string;
  desk_id: number;
  com_port: string;
  serial_number: string;
  position: number;
  desk: Desk;
};
```

### Betting & Reporting Types

```typescript
type BetResult = {
  last_round: number;
  bets: Array<{ result_id: number; amount: number; image: string }>;
};

type UserBetResults = {
  id: number;
  report_date: string;
  amount_summary: number;
  win_lose_total_amount: number;
  commission_summary: number;
  total_net_win_lose: number;
};

type BetDetails = {
  desk_name: string;
  shoe_round_no: string;
  after_balance: number;
  trans_amount: number;
  transaction_type: string;
  transaction_time: string;
  bet_amount: number;
  actual_win_lose_amount: number;
  win_lose_flg: string;
  settle_flg: string;
  commission: number;
  status_text: string;
  bet_result_id: number;
};

type Transaction = {
  id: number;
  bet_result_id: number;
  transaction_type: string;
  amount?: number;
  before_amount: number;
  after_amount: number;
};
```

### API Response Wrapper

```typescript
type Response<T> = {
  success: boolean;
  message: string;
  data: ResponseData;
};

// ResponseData contains domain-specific arrays plus pagination metadata
```

---

## 8. Design System & Common Styles

### 8.1 Theme System

The project uses **Tailwind CSS v4** with CSS custom properties for theming. The theme is defined in `src/index.css` using OKLCH color space.

#### CSS Custom Properties

```css
:root {
  --main-color: #064f7c;          /* Primary brand blue */
  --radius: 0.625rem;             /* Base border radius */
  --background: oklch(1 0 0);     /* White */
  --foreground: oklch(0.145 0 0); /* Near-black */
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --destructive: oklch(0.577 0.245 27.325); /* Red */
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
```

Dark mode is supported via `.dark` class with inverted values.

#### Semantic Color Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | White | Near-black | Page backgrounds |
| `--foreground` | Near-black | Near-white | Text |
| `--primary` | Dark | Light | Primary buttons, headings |
| `--secondary` | Light gray | Dark gray | Secondary elements |
| `--muted` | Light gray | Dark gray | Muted text, backgrounds |
| `--destructive` | Red | Lighter red | Error states, delete actions |
| `--border` | Light gray | Transparent white 10% | Borders |
| `--sidebar-*` | Variants | Variants | Sidebar-specific colors |
| `--chart-1..5` | Various | Various | Chart/graph colors |

#### Border Radius Scale

| Token | Value |
|-------|-------|
| `--radius-sm` | `calc(0.625rem - 4px)` |
| `--radius-md` | `calc(0.625rem - 2px)` |
| `--radius-lg` | `0.625rem` |
| `--radius-xl` | `calc(0.625rem + 4px)` |

### 8.2 Domain-Specific Color Palette

#### Casino / Gaming Theme

| Color | Hex | Usage |
|-------|-----|-------|
| Casino Brown | `#3a2f1d` | Game table backgrounds |
| Gold | `#d29b24` | Accents, highlights, coin elements |
| Light Gold | `#e3c67d` | Secondary gold accents |
| Dark Gold Stroke | `#8f7103` | Text stroke on game elements |
| Active Link Brown | `rgba(109, 67, 19, 0.5)` | Active navigation state |

#### Game Result Colors

| Color | Usage |
|-------|-------|
| Red | Banker (Baccarat), Dragon (Longhu) |
| Blue | Player (Baccarat), Tiger (Longhu) |
| Green | Tie results |

#### Admin Theme

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | `#064f7c` | Main admin color (`--main-color`) |
| Sidebar Black | `#000000` | Admin sidebar background |
| Body Gray | `#e1e1e2` | Page background |
| Tab Active | `#000` | Active tab background |
| Tab Inactive | `grey` | Inactive tab background |

### 8.3 Typography

Typography components are available in `src/components/ui/`:

| Component | Element | Usage |
|-----------|---------|-------|
| `TypographyH1` | `<h1>` | Page titles |
| `TypographyH2` | `<h2>` | Section headings |
| `TypographyH3` | `<h3>` | Sub-section headings |
| `TypographyH4` | `<h4>` | Minor headings |
| `TypographyP` | `<p>` | Body text |

Special text style:
```css
.text-white-yellow-stroke {
  color: white;
  text-shadow: -1.8px -1.8px 0 #8f7103,
               1.8px -1.8px 0 #8f7103,
              -1.8px  1.8px 0 #8f7103,
               1.8px  1.8px 0 #8f7103;
}
```
Used for game UI text with gold outline effect on casino-themed backgrounds.

### 8.4 Custom Animations

| Class | Keyframes | Duration | Usage |
|-------|-----------|----------|-------|
| `.animate-marquee` | `marquee` | 15s linear infinite | Announcement ticker scrolling |
| `.animate-fadeIn` | `fadeIn` | 0.2s ease-out | Dialog/panel entrance |
| `.animate-pulse-custom` | `pulse-custom` | 2s ease-in-out infinite | Pulsing scale effect (1x → 1.3x) |
| `.rotate-swing` | `rotate-swing` | 1.3s ease-in-out infinite | Swinging rotation (coin flip, etc.) |
| `.flash-win` | `flashWin` | 1s ease-in-out 3x | Win highlight (green glow flash) |
| `.animate-flash-border` | `flash-border` | 0.6s ease-in-out 3x | Flashing yellow border (bet confirmation) |

### 8.5 Utility Classes

```css
.scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
/* + ::-webkit-scrollbar { display: none; } */
```

Global body rule:
```css
body {
  user-select: none;  /* Prevent text selection (casino UI) */
  background-color: #e1e1e2;
}
```

### 8.6 Button Variants

The `Button` component (`src/components/ui/button.tsx`) uses `class-variance-authority` with these variants:

| Variant | Purpose |
|---------|---------|
| `default` | Standard button |
| `destructive` | Delete/danger actions |
| `outline` | Bordered button |
| `secondary` | Secondary actions |
| `ghost` | Minimal/transparent button |
| `link` | Link-styled button |
| `success` | Success/confirm actions |
| `warning` | Warning actions |
| `info` | Informational actions |
| `danger` | Danger variant |
| `adminPanel` | Admin sidebar panel button |

### 8.7 Layout Patterns

#### User Portal Layout
- Full-viewport, no-scroll design
- Three-panel layout (sidebar + center + right panel)
- Fixed 1920x1080 base with viewport scaling via `useScaleLayout` hook
- Right-click disabled for casino security

#### Admin Portal Layout
- Collapsible sidebar navigation (black background)
- Top navbar with breadcrumbs
- Content area with loading states
- Wrapped in `LoadingProvider` context

#### Operator Portal Layout
- Fixed 1920x1080 with CSS viewport scaling
- Single-page interface per game type
- No navigation (operators stay on assigned desk)

### 8.8 Responsive Behavior

- Mobile breakpoint: `1000px` (via `useMobile` hook)
- Layout scaling: `useScaleLayout` hook calculates scale based on viewport vs 1920x1080 reference
- Browser-specific scaling config in `lib/utils.ts`
- Tables: `useTableScroll` hook provides auto-scroll-right and mouse drag scrolling

---

## 9. Component Library

### 9.1 UI Primitives (Radix-based)

Located in `src/components/ui/`. All built on Radix UI with Tailwind styling:

AlertDialog, Breadcrumb, Button, Calendar, Card, Checkbox, Collapsible, Dialog, DropdownMenu, Input, Label, Pagination, Popover, RadioGroup, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Tabs, Table, Textarea, Tooltip, Sonner (Toast)

### 9.2 Shared Components

Located in `src/components/shared/`:

| Component | Purpose |
|-----------|---------|
| `InputField` | Text input with label and error display |
| `SelectField` | Select dropdown with label and error display |
| `CheckboxField` | Checkbox with label and error display |
| `RadioField` | Radio button with label |
| `TextareaField` | Textarea with label and error display |
| `DatePicker` | Date selection |
| `DateTimePicker` | Date and time selection |
| `DataTable` | Full-featured data table with row selection and inline editing |
| `ResultTable` | Game result display table |
| `BasePagination` | Pagination with page size selector |
| `CommonSearchPanel` | Date range search with quick-select buttons (Today, Yesterday, 7 Days, etc.) |
| `ActionDropdown` | Row actions menu (Detail, Edit, Delete) |
| `RowActions` | Alternative row action menu |
| `ConfirmDialog` | Multi-purpose confirmation (success/fail/error/confirm) |
| `DeleteDialog` | Delete confirmation with warning |
| `EditDialog` | Edit record dialog |
| `ChangeDialog` | Dialog for changing game settings |
| `ConfirmResultDialog` | Game result confirmation |
| `ConfirmRecalculateDialog` | Recalculation confirmation |
| `ErrorTooltip` | Error message tooltip |
| `CardInputPanel` | Card input interface for game operators |
| `AdminCardInputPanel` | Admin card input panel |
| `CommonCardTable` | Card-based table display |
| `AgentTree` | Hierarchical agent tree visualization |
| `SettingMenu` | Settings dropdown menu |
| `LazyRoute` | Lazy-loaded route wrapper with Suspense |

### 9.3 Roadmap Components

Located in `src/components/roadmaps/`:

| Component | Purpose |
|-----------|---------|
| `BigRoad` | Main baccarat roadmap (primary display) |
| `BigEyeRoad` | Big eye road pattern analysis |
| `SmallRoad` | Small road pattern analysis |
| `CockroachRoad` | Cockroach road pattern analysis |
| `SecondBigRoad` | Secondary big road display |
| `MarkerRoad` | Marker road display |
| `NiuniuRoad` | Niuniu-specific result road |

### 9.4 Loading Components

| Component | Purpose |
|-----------|---------|
| `PageLoader` | User portal page loading state |
| `AdminPageLoader` | Admin portal page loading state |
| `Loading` | Generic loading spinner |

---

## 10. State Management

### React Contexts

| Context | Provider | State |
|---------|----------|-------|
| `GameContext` | `GameProvider` | Game status, bet balance, current user, last round, refresh key, multiple desk state |
| `CardBoardContext` | `CardBoardProvider` | Card display state for Baccarat/Longhu (dragon/tiger/banker/player cards) |
| `NiuniuCardBoardContext` | `NiuniuCardBoardProvider` | Card display state for Niuniu (banker + 3 players) |
| `UserManagementContext` | `UserManagementProvider` | Selected user, common account, agents list (admin) |
| `LoadingContext` | `LoadingProvider` | Loading state, balance/total balance, permissions, common admin actions |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useMobile` | Detects mobile viewport (breakpoint: 1000px) |
| `useTableScroll` | Auto-scrolls tables to right edge, enables mouse drag scrolling |
| `useScaleLayout` | Calculates viewport scale factor against 1920x1080 reference, disables right-click |

---

## 11. Form Validation

Validation schemas are in `src/validation/` using Yup:

| Schema | File | Fields |
|--------|------|--------|
| `ChangePasswordSchema` | `admin/ChangePasswordSchema.tsx` | Password change validation |
| `SubAccountSchema` | `admin/SubAccountSchema.tsx` | Sub-account creation |
| `TopUpSchema` | `admin/TopUpSchema.tsx` | Balance top-up amount |
| `ModifyStatusSchema` | `admin/ModifyStatusSchema.tsx` | Status modification |
| `UserChangePasswordSchema` | `admin/UserChangePasswordSchema.tsx` | User password change |
| `NickNameSchema` | `admin/NickNameSchema.tsx` | Nickname update |
| `NewUserSchema` | `admin/NewUserSchema.tsx` | New user creation |
| `UpdateUserSchema` | `admin/UpdateUserSchema.tsx` | User update |
| `UserAnnouncementSchema` | `admin/UserAnnouncementSchema.tsx` | Announcement validation |

Validation messages support i18n via `src/validation/messages/ValidationMessages.ts` and `translateError.ts`.

---

## 12. Internationalization

### Supported Languages

| Language | File | Key Count |
|----------|------|-----------|
| Chinese (Simplified) | `src/locales/zh.json` | ~580+ keys |
| English | `src/locales/en.json` | ~580+ keys |

### Translation Categories

- Dashboard & navigation labels
- User management (agents, members, accounts, roles)
- Game types and betting terms (banker, player, dragon, tiger, tie, pairs)
- Common actions (search, export, submit, update, delete, cancel)
- Form labels and validation messages
- Dialog messages (confirm, success, error)
- Report management (code lookup, summary, tabletop, boot, daily)
- System management (desks, cameras, scanners, rate limits)
- Game rules and help content

### Configuration

i18next with `i18next-browser-languagedetector` for automatic language detection. Used via `useTranslation` hook in components.

---

## 13. API Endpoint Reference

### Authentication

| Method | Endpoint | Portal |
|--------|----------|--------|
| POST | `/auth/login` | Admin |
| POST | `/auth/player_login` | User |
| POST | `/auth/player_logout` | User |
| POST | `/auth/operator_login` | Operator |

### User Portal (`/user/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/user/games` | List available games |
| GET | `/user/desks` | List game desks |
| GET | `/user/cameras` | List cameras |
| GET | `/user/users/{id}` | Get player info |
| GET | `/user/results_by_desk/{desk_id}` | Desk results for roadmap |
| GET | `/user/last_round_status/{desk_id}` | Current round status |
| GET | `/user/niuniu_results/{desk_id}` | Niuniu results |
| GET | `/user/confirm_bets/{last_round}` | Confirmed bets |
| POST | `/user/bet_results` | Place bets |
| PUT | `/user/bet_results` | Update bet results |
| POST | `/user/cancle_bet_results` | Cancel bets |
| PUT | `/user/bet_keys` | Update bet key |
| GET | `/user/user_bet_results` | Bet history summary |
| GET | `/user/user_bet_results/detail` | Bet details by date |
| GET | `/user/user_bet_results/detail/cards` | Result cards by round |
| GET | `/user/transactions` | Transaction history |

### Operator Portal (`/operator/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/operator/desks/{id}` | Get desk info |
| GET | `/operator/game_infos/{id}` | Get game configuration |
| POST | `/operator/results` | Submit round result |
| POST | `/operator/niuniu_results` | Submit Niuniu result |
| PUT | `/user/game_rounds/{id}` | Update round status |
| POST | `/operator/finish_game_session/{desk_id}` | End game session |
| POST | `/operator/invalid_game` | Invalidate a round |
| POST | `/operator/confirm_account` | Verify operator |

### Admin Portal (`/admin/`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/admin/announce` | Announcements CRUD |
| GET/POST/PUT | `/admin/users` | User management |
| GET/POST | `/admin/results` | Result management |
| GET/POST | `/admin/rate_limits` | Rate limit CRUD |
| GET/POST | `/admin/user_rate_limits` | Per-user rate limits |
| GET/POST/PUT/DELETE | `/admin/cameras` | Camera CRUD |
| GET/POST/PUT/DELETE | `/admin/desks` | Desk CRUD |
| GET/POST/PUT/DELETE | `/admin/scanners` | Scanner CRUD |
| GET | `/admin/round_results` | Round results |
| GET | `/admin/game_sessions` | Game sessions |
| GET | `/admin/game_rounds` | Game rounds |
| GET | `/admin/games` | Game list |
| GET | `/admin/roles` | Role list |
| GET/POST | `/admin/operation_logs` | Operation logs |
| GET/POST | `/admin/login_infos` | Login info |
| GET | `/admin/bet_results/report_mamnagement/*` | Reports (code lookup, summary, daily, online players) |
| POST | `/admin/recalculates/*` | Result recalculation |

---

## 14. Build & Development

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Vite, host 0.0.0.0) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API base URL (development) |
| `VITE_IFRAME_ALLOWED_ORIGINS` | Comma-separated origins allowed for camera/stream iframes (e.g. `https://cctv.yarchang.net`). If unset, a default list is used. |
| `MODE` | Build mode (`development` / `production`) |

### Deployment

- Dockerfile present for containerized deployment
- Production API path: `/api` (same origin)
- Production socket path: `/socket.io` (same origin)

---

## 15. Security Considerations

Documented security items (see `SECURITY_FIXES.md`; for server-side security, see [`server/SECURITY_FIXES.md`](../server/SECURITY_FIXES.md)):

1. **Operator/Admin route guards missing** -- Client-side auth guards not implemented for operator and admin portals (server-side API auth still enforced)
2. **Sub-account permission scoping** -- `x-client-page` header sent for server-side route permission validation
3. **Token invalidation** -- 401 responses trigger global logout with localStorage cleanup
4. **Session management** -- `beforeunload` beacon for player logout
5. **Text selection disabled** -- `user-select: none` on body to prevent UI text copying
6. **Right-click disabled** -- Via `useScaleLayout` hook for casino security
