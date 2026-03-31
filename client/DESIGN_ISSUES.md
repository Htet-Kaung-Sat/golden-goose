# Design Issues Guide

This document outlines software design and code quality issues in the Kinpo client application and provides guidance on how to resolve each one.

> For server-side design issues, see [`server/DESIGN_ISSUES.md`](../server/DESIGN_ISSUES.md).

---

## HIGH

### 1. No Test Infrastructure — ⚠️ UNFIXED

**File:** `package.json`

**Problem:**
There are zero tests in the client codebase. No test runner, no test files, no test utilities. For a financial application with complex betting logic, roadmap calculations, and multi-role authentication flows, this creates significant risk.

Key areas that should be tested:
- **Betting flow** — bet placement, confirmation, cancellation, and balance display.
- **Roadmap rendering** — given a set of results, the roadmap grids should display correctly (BigRoad, BigEyeRoad, SmallRoad, CockroachRoad patterns).
- **Auth flow** — login, logout, session expiry handling, role-based routing.
- **Form validation** — Yup schemas produce correct error messages for edge cases.

**Fix:**
- Add Vitest (recommended for Vite projects) and React Testing Library:
  ```bash
  npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
  ```
- Start with tests for the most critical flows:
  1. Betting board — correct amounts calculated and submitted.
  2. Roadmap components — given input data, renders expected grid.
  3. Auth guard — redirects when not authenticated.
  4. Form validations — edge cases for schemas in `src/validation/`.

---

### 2. Large Monolithic Page Components — ⚠️ UNFIXED

**Files:** `src/pages/user/Home.tsx`, `src/pages/user/GamePlayer.tsx`, operator game pages

**Problem:**
Several page components are likely very large (based on the number of features they contain per the PROJECT_SPEC.md). The Home page alone manages:
- Game type filtering
- Desk grid rendering with roadmap previews
- Camera stream sidebar
- Announcement marquee and popup
- Balance display and refresh
- Settings, Help, Report, Agreement dialogs
- Socket event listeners for balance and announcement updates
- Multiple Bet toggle

All of this in a single component file makes it difficult to:
- Understand the component's responsibility.
- Find and fix bugs in specific features.
- Reuse sub-features across pages.
- Test individual behaviors.

**Fix:**
Break large pages into composable sub-components:
```
pages/user/Home.tsx              → Orchestrator (layout + state coordination)
  components/user/DeskGrid.tsx   → Desk card grid with filtering
  components/user/DeskCard.tsx   → Individual desk card with mini roadmap
  components/user/CameraSidebar.tsx → Camera stream + swap
  components/user/AnnouncementBar.tsx → Marquee + popup
  components/user/LobbyHeader.tsx    → Balance, settings, quick actions
```

Each sub-component receives only the props it needs, making it independently testable and memoizable.

---

### 3. API Layer Has No Error Typing — ⚠️ UNFIXED

**Files:** `src/api/` (all API files)

**Problem:**
API calls return `AxiosResponse<any>` — the response data is untyped. Callers access `response.data.data.desks`, `response.data.data.user`, etc. without any type safety. If the server changes the response shape, the client will silently access `undefined` with no compile-time warning.

TypeScript types exist in `src/types/` but are used only for local state, not for API responses.

**Fix:**
- Define response types for each API endpoint:
  ```ts
  interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }

  interface GetDesksResponse {
    desks: Desk[];
  }

  export const getDesks = () =>
    API.get<ApiResponse<GetDesksResponse>>("/user/desks");
  ```
- This provides autocomplete, compile-time checking, and documentation for the API layer.

---

## MEDIUM

### 4. Typos in Code and File Names — ⚠️ UNFIXED

**Problem:**
Several typos exist in the codebase that affect searchability and code clarity:

| Location | Typo | Correct |
|----------|------|---------|
| `src/utils/Sesssion.ts` | Filename `Sesssion` (triple 's') | `Session` |
| `src/contexts/GameContext.tsx` line 22 | Default status `"acctive"` | `"active"` |
| `src/contexts/GameContext.tsx` line 39 | State init `"acctive"` | `"active"` |
| API route (referenced in multiple files) | `cancle_bet_results` | `cancel_bet_results` |

**Fix:**
- Rename `Sesssion.ts` → `Session.ts` and update all imports (2 files: `App.tsx` and anywhere it's imported).
- Fix `"acctive"` → `"active"` in GameContext (2 occurrences).
- Coordinate with the server to rename the `cancle_bet_results` route (requires both client and server changes).

---

### 5. No `.env.example` File — ⚠️ UNFIXED

**Problem:**
The client requires environment variables (`VITE_API_BASE_URL`, `VITE_IFRAME_ALLOWED_ORIGINS`) but there is no `.env.example` documenting them. A new developer must read source code to discover which variables are needed.

**Fix:**
Create `client/.env.example`:
```env
# API base URL (development server)
VITE_API_BASE_URL=http://localhost:3001

# Comma-separated origins allowed for camera/video stream iframes
# If unset, defaults to https://cctv.yarchang.net
VITE_IFRAME_ALLOWED_ORIGINS=https://cctv.yarchang.net

# External service URL (customer service link)
# VITE_EXTERNAL_SERVICE_URL=
```

---

### 6. Inconsistent State Storage Strategy — ⚠️ UNFIXED

**Files:** `src/api/axios.ts`, `src/pages/*/Login.tsx`, `src/utils/Sesssion.ts`

**Problem:**
After the security fix to migrate from `localStorage` to `sessionStorage`, the storage strategy is inconsistent:

| Data | Stored In | Should Be |
|------|-----------|-----------|
| `rememberedAccount` | `localStorage` | `localStorage` (correct — persists across sessions) |
| `remember`, `remember_account` | `localStorage` | `localStorage` (correct) |
| `playerID` | `sessionStorage` | `sessionStorage` (correct) |
| `account`, `name` | `sessionStorage` | `sessionStorage` (correct) |
| `loginUser` | `localStorage` (read in axios.ts line 54) | `sessionStorage` |
| `pendingBets*` | `localStorage` | Unclear — may need to persist across tabs |
| `desk_id` | `sessionStorage` | `sessionStorage` (correct) |

The `loginUser` inconsistency is also a security issue (see SECURITY_FIXES.md #14).

**Fix:**
- Create a centralized `src/utils/storage.ts` module that defines which keys go where:
  ```ts
  const SESSION_KEYS = ["playerID", "account", "name", "loginUser", "desk_id"] as const;
  const LOCAL_KEYS = ["rememberedAccount", "remember", "remember_account"] as const;
  ```
- All reads/writes go through this module instead of directly calling `localStorage` / `sessionStorage`.
- Document the rationale for each key's storage location.

---

### 7. i18n Keys Inconsistent Between Languages — ⚠️ UNFIXED

**Files:** `src/locales/en.json`, `src/locales/zh.json`

**Problem:**
With 580+ translation keys, there is no mechanism to ensure both language files have the same keys. Missing keys fall back to the key string itself (e.g., `"admin.user_management.topup"` appears as raw text instead of a translation).

Additionally, some UI text is hardcoded in Chinese directly in components rather than using i18n keys (observed in auth controllers on the server side returning Chinese error messages — the client likely has similar patterns).

**Fix:**
- Add a build-time script or ESLint plugin that compares `en.json` and `zh.json` keys and reports mismatches.
- Audit components for hardcoded Chinese text and replace with i18n keys.
- Consider using `i18next-parser` to extract translation keys from source code and generate a report of missing translations.

---

## LOW

### 8. `useScaleLayout` Disables Right-Click Globally — ⚠️ UNFIXED

**File:** `src/hooks/useScaleLayout.ts`

**Problem:**
The `useScaleLayout` hook disables right-click (`contextmenu` event) across the application for "casino security." While this prevents casual users from inspecting elements, it does not provide actual security — DevTools can still be opened via F12, keyboard shortcuts, or browser menus. It creates a poor developer experience during development and testing.

**Fix:**
- Only disable right-click in production mode:
  ```ts
  if (import.meta.env.MODE === "production") {
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  ```
- Or remove the restriction entirely — it provides no real security benefit and frustrates power users.

---

### 9. Router Created Inside Component Render — ✅ FIXED

**File:** `src/App.tsx` (router at module scope, ~line 176)

**Problem:**
`createBrowserRouter()` is called inside the `App` component function body. While React Router v7 handles this correctly in practice, the router is technically recreated on every render of `App`. This is a minor issue since `App` rarely re-renders, but it's a code quality concern.

**Fix:**
Move the router creation outside the component:
```tsx
const router = createBrowserRouter([...]);

function App() {
  return (
    <div>
      <Toaster position="top-right" richColors closeButton />
      <RouterProvider router={router} />
    </div>
  );
}
```

---

## Priority Order for Fixes

| Priority | Issue # | Effort | Impact |
|----------|---------|--------|--------|
| 1st | #1 — Add test infrastructure | High | Safety net for financial logic |
| 2nd | #2 — Break up large page components | Medium | Maintainability and reusability |
| 3rd | #3 — Type API responses | Medium | Compile-time safety |
| 4th | #6 — Centralize storage strategy | Low | Consistency and security |
| 5th | #4 — Fix typos | Low | Code clarity |
| 6th | #5 — Create .env.example | Low | Developer onboarding |
| 7th | #7 — Validate i18n completeness | Low | UI quality across languages |
| 8th | #8 — Conditional right-click disable | Low | Developer experience |
| 9th | #9 — Move router outside component | Low | Code correctness |
