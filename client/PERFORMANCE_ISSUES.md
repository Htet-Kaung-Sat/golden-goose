# Performance Issues Guide

This document outlines all identified performance problems in the Kinpo client application and provides guidance on how to resolve each one.

> For server-side performance issues, see [`server/PERFORMANCE_ISSUES.md`](../server/PERFORMANCE_ISSUES.md).

---

## React Compiler (Already Enabled)

The project uses **React Compiler** via `babel-plugin-react-compiler` in [`vite.config.ts`](vite.config.ts). The compiler automatically memoizes components and expensive computations (equivalent to automatic `React.memo`, `useMemo`, and `useCallback` where safe).

**Issues mitigated by React Compiler:**

- **#3 (Roadmap re-compute)** — Largely addressed. The compiler will skip re-renders of roadmap components when their props (e.g. result data) are unchanged, and will memoize grid computations. Manual `React.memo` / `useMemo` on roadmaps is optional when the compiler is enabled.
- **#1 (GameContext)** — Partially helped. The compiler cannot change context subscription behavior (all consumers still run when any context value changes), but it can reduce _cascading_ re-renders: children of context consumers may skip re-renders when their props are unchanged.

**Issues not affected by React Compiler:** #2 (virtualization), #4 (socket cleanup), #5 (prefetch), #6 (CustomEvent dispatch frequency), #7 (bundle size).

---

## HIGH

### 1. GameContext Causes Unnecessary Re-renders — ⚠️ UNFIXED

**File:** `src/contexts/GameContext.tsx`

**Problem:**
`GameContext` bundles 6 independent state values in a single context provider:

```tsx
value={{
  status, setStatus,           // Game round status
  betBalance, setBetBalance,   // Betting balance
  user, setUser,               // Current user data
  lastRound, setLastRound,     // Last round info
  refreshKey, triggerRefresh,  // Manual refresh trigger
  multipleDesks, setMultipleDesks, // Multi-bet desk list
}}
```

Every time ANY of these values changes, ALL consumers of `useGameContext()` re-render — even if they only use one field. For example:

- A component that only reads `status` re-renders when `betBalance` changes.
- A component that only reads `multipleDesks` re-renders when `refreshKey` increments.

During a live game round, `status`, `betBalance`, and `lastRound` change frequently (timer ticks, bet confirmations, round transitions). This causes unnecessary re-renders across all game-related components simultaneously.

**Note:** React Compiler (see above) reduces cascading re-renders from context consumers to their children but does not fix the root cause — every `useGameContext()` consumer still re-runs when any value in the context changes.

**Fix:**

**Option A (split contexts):**

```tsx
// Separate high-frequency from low-frequency state
const BetContext; // betBalance, setBetBalance
const RoundContext; // status, setStatus, lastRound, setLastRound, refreshKey, triggerRefresh
const UserContext; // user, setUser
const DeskContext; // multipleDesks, setMultipleDesks
```

**Option B (memoize context value):**

```tsx
const value = useMemo(
  () => ({
    status,
    setStatus,
    betBalance,
    setBetBalance,
    user,
    setUser,
    lastRound,
    setLastRound,
    refreshKey,
    triggerRefresh,
    multipleDesks,
    setMultipleDesks,
  }),
  [status, betBalance, user, lastRound, refreshKey, multipleDesks],
);
```

Note: Option B still re-renders all consumers when any value changes, but prevents re-renders when the parent re-renders without state changes. Option A is the proper solution.

**Option C (use a state management library):**
Consider Zustand or Jotai which allow selective subscriptions — components only re-render when the specific slice of state they use changes.

---

### 2. No Virtualization for Long Lists — ⚠️ UNFIXED

**Files:** `src/pages/admin/personnel_management/` (various), `src/pages/user/GamePlayerRightSideDesks.tsx`, report pages

**Problem:**
Admin pages render potentially large lists of users, transactions, bet results, and operation logs as full DOM elements. While server-side pagination helps, the tables themselves render all rows in the current page to the DOM at once.

The desk selection panels (`GamePlayerRightSideDesks`, right-side desk list in MultipleBet) render all available desks with their roadmap previews. Each desk card includes canvas-based roadmap rendering, which is expensive.

**Fix:**

- For admin data tables with large datasets (>100 rows per page), consider React virtualization (`@tanstack/react-virtual` or `react-window`). This renders only the visible rows.
- For desk lists with roadmap previews, lazy-render the roadmaps — only compute and render roadmaps for desks visible in the scroll viewport.
- This is a lower priority since server-side pagination limits most lists, but becomes important if page sizes increase or lists grow.

---

## MEDIUM

### 3. Roadmap Components Re-compute on Every Render — ✅ MITIGATED BY REACT COMPILER

**Files:** `src/components/roadmaps/BigRoad.tsx`, `BigEyeRoad.tsx`, `SmallRoad.tsx`, `CockroachRoad.tsx`, `SecondBigRoad.tsx`, `MarkerRoad.tsx`, `NiuniuRoad.tsx`

**Problem:**
Seven roadmap components render game result patterns as visual grids. These components receive result data as props and compute grid layouts on every render. When the parent component re-renders (e.g., due to timer updates from the GameContext issue #1), the roadmap grid would be recomputed even though the result data hasn't changed.

On the Home page, every visible desk card renders a mini roadmap. With 20 desks visible, that's 20 roadmap computations on every re-render.

**Mitigation:** With **React Compiler** enabled in [`vite.config.ts`](vite.config.ts), the compiler automatically memoizes these components and their computations — equivalent to applying `React.memo()` and `useMemo` for the grid calculation. Re-renders and recomputation are skipped when props (e.g. result data) are unchanged. No manual changes required unless you observe regressions or the compiler de-opts (e.g. due to impure code).

**Optional manual fix (if needed):**

- If a roadmap is excluded from the compiler or de-opts, wrap it in `React.memo()` and memoize the grid computation with `useMemo` keyed on the results data.
- If roadmaps use canvas, ensure the computation is pure so the compiler can memoize it; otherwise extract it into a `useMemo`-wrapped calculation step.

---

### 4. Socket Event Handlers Not Cleaned Up Properly — ⚠️ UNFIXED

**Files:** Various pages that use `getSocket().on(...)` / `getSocket().off(...)`

**Problem:**
Socket event listeners are registered in `useEffect` hooks across multiple pages (Home, GamePlayer, operator pages). If cleanup functions don't perfectly match the handler references, stale listeners accumulate. Each leaked listener processes incoming events and may trigger state updates on unmounted components.

Additionally, the socket singleton in `src/lib/socket.ts` is never disconnected when a user logs out — `disconnectSocket()` is exported but may not be called during logout flow.

**Fix:**

- Audit all `useEffect` hooks that register socket listeners. Ensure the cleanup function uses the exact same function reference for `.off()` as was used for `.on()`.
- Call `disconnectSocket()` in `handleGlobalLogout()` (in `src/api/axios.ts`) to ensure socket connections are cleaned up on logout.
- Consider a custom `useSocket(event, handler)` hook that handles registration and cleanup automatically.

---

### 5. All Admin Pages Lazy-Loaded Without Prefetch — ⚠️ UNFIXED

**File:** `src/App.tsx`

**Problem:**
All ~54 admin page routes use `React.lazy()` for code splitting. While this reduces the initial bundle size, it means every admin page navigation triggers a dynamic import, showing a loading spinner. For frequently-accessed pages (Dashboard, User Management, Reports), this creates a sluggish navigation experience.

**Fix:**

- Prefetch critical admin routes after initial load:
  ```tsx
  useEffect(() => {
    // Prefetch common admin pages after the app is idle
    requestIdleCallback(() => {
      import("./pages/admin/Dashboard");
      import("./pages/admin/personnel_management/user_management");
    });
  }, []);
  ```
- Or use route-level prefetch on hover/focus of navigation links.
- Keep lazy loading for rarely-used pages (Recalculate, Developer User Management, etc.).

---

### 6. Balance Update via CustomEvent + Response Interceptor — ✅ FIXED

**File:** `src/api/axios.ts` (lines 81–106)

**Problem (was):**
Every successful API response on admin pages dispatched a `CustomEvent("balanceUpdate")` with balance data extracted from response headers, causing unnecessary re-renders even when balance values were unchanged.

**Fix (applied):**

- Cached `lastBalance`, `lastTotalBalance`, and `lastPermission` in module scope.
- Only dispatch the event when any value has actually changed: `balance !== lastBalance || totalBalance !== lastTotalBalance || permission !== lastPermission`.
- This prevents redundant CustomEvent dispatches and unnecessary React re-renders in balance listeners.

---

## LOW

### 7. Duplicate Date Libraries — ✅ FIXED

**File:** `package.json`

**Problem:**
Both `date-fns` (^4.1.0) and `dayjs` (^1.11.19) were dependencies. Two date libraries in the client bundle added unnecessary weight.

**Fix applied:**

- Standardized on `dayjs` for all application date formatting.
- Replaced `date-fns` `format()` usage in `CommonSearchPanel`, `DateTimePicker`, and `DatePicker` with `dayjs` equivalents.
- Switched Calendar locale imports from `date-fns/locale` to `react-day-picker/locale` (which re-exports date-fns locales for the Calendar component).
- Removed `date-fns` from `package.json`. It remains only as a transitive dependency of `react-day-picker`.

---

## Priority Order for Fixes

| Priority | Issue #                                               | Effort                                           | Impact                                   |
| -------- | ----------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| 1st      | #1 — Split GameContext or use selective subscriptions | Medium                                           | Reduces re-renders across all game views |
| 2nd      | #3 — Memoize roadmap components                       | Low (optional; React Compiler already mitigates) | Reduces computation on Home page         |
| 3rd      | #4 — Fix socket listener cleanup                      | Low                                              | Prevents memory leaks and stale updates  |
| 4th      | #6 — Optimize balance update dispatch                 | Low                                              | ✅ Done                                  |
| 5th      | #5 — Prefetch critical admin routes                   | Low                                              | Faster admin navigation                  |
| 6th      | #2 — Add virtualization for large lists               | Medium                                           | Smoother scrolling on large datasets     |
| 7th      | #7 — Remove duplicate date library                    | Low                                              | Smaller bundle size                      |
