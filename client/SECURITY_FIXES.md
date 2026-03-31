# Security Fixes Guide

This document outlines all identified security vulnerabilities in the Kinpo client application and provides guidance on how to resolve each one.

> For server-side vulnerabilities and fixes, see [`server/SECURITY_FIXES.md`](../server/SECURITY_FIXES.md).

---

## CRITICAL

### 1. Plaintext Password Stored in localStorage — **FIXED**

**File:** `src/pages/user/Login.tsx`

**Problem:**
When the "remember me" checkbox is checked, the user's raw password is saved to `localStorage` under the key `remember_password`. `localStorage` has no expiry, no access control, and is readable by any JavaScript running on the same origin. Any XSS vulnerability anywhere on the page can steal the user's actual password.

**Fix:**

- Remove `localStorage.setItem("remember_password", password)` entirely.
- The "remember me" feature should only persist the **account name**, never the password.
- If persistent login is needed, implement a server-side **refresh token** stored in an `httpOnly` cookie. The server issues a short-lived access token and a long-lived refresh token. On return visits, the client silently exchanges the refresh token for a new access token — no password storage required.

**Status:** Implemented (account-only). The app no longer reads or writes `remember_password`. "Remember me" (记住帐号) now only persists the account name in `localStorage`; the password field is not pre-filled. Users can still use the browser's password manager to save and fill credentials. Login form has `autoComplete="username"` and `autoComplete="current-password"` to support browser autofill. Refresh token / httpOnly cookie was not implemented in this fix.

---

## HIGH

### 2. JWT Token Stored in localStorage — **FIXED**

**Files:** `src/pages/user/Login.tsx`, `src/pages/admin/Login.tsx`, `src/pages/operator/Login.tsx`

**Problem:**
All three login flows store the JWT in `localStorage`. If an attacker achieves XSS, they can read `localStorage.getItem("token")` and exfiltrate the token to impersonate the user remotely.

**Fix:**

- Move token storage to an **httpOnly, Secure, SameSite=Strict** cookie set by the server.
- The browser will automatically attach the cookie on every request; the client code never needs to read or write the token directly.
- If cookies are not feasible, use `sessionStorage` instead of `localStorage` (limits exposure to the current tab) and pair it with strong Content Security Policy headers to reduce XSS risk.
- Remove all `localStorage.getItem("token")` and `localStorage.setItem("token", ...)` calls and replace with the chosen strategy.

**Status:** Implemented. The server sets the JWT in an **httpOnly, Secure, SameSite=Strict** cookie via `cookie-parser` and a new `server/utils/authCookie.js` helper. All three login controllers (user, admin, operator) no longer return `token` in the response body; they call `setAuthCookie(res, token)` instead. The auth middleware reads the token from `req.cookies.auth_token` first, with fallback to the `Authorization` header. User logout clears the cookie server-side via `clearAuthCookie(res)`. On the client, axios uses `withCredentials: true`; the request interceptor no longer sets the `Authorization` header from localStorage. All `localStorage.setItem("token", ...)` and `localStorage.getItem("token")` calls have been removed. Non-sensitive session data (playerID, account, name, loginUser, desk_id) has been moved from `localStorage` to `sessionStorage` for display purposes only.

---

### 3. Missing Authentication Guards on Admin and Operator Routes — ⚠️ UNFIXED

**Files:** `src/layouts/admin/Main.tsx`, `src/layouts/operator/Main.tsx`

**Problem:**
The user layout checks for `playerID` in `sessionStorage` and redirects to `/login` if missing (auth is enforced via the httpOnly cookie on API calls). The admin and operator layouts have **no equivalent guard**. A user can navigate directly to `/admin` or `/operator` and the page will attempt to render.

**Fix:**

- Add authentication checks to both `src/layouts/admin/Main.tsx` and `src/layouts/operator/Main.tsx`, similar to what exists in `src/layouts/user/Main.tsx`.
- Each layout should verify the presence of a valid token on mount. If absent, redirect to the corresponding login page (`/admin/login` or `/operator/login`).
- Additionally, make an API call on mount to validate the token server-side (e.g., a lightweight `/auth/verify` endpoint). If the token is expired or revoked, redirect to login.
- **Server-side enforcement is still essential** — never rely solely on client-side guards.

---

### 4. Iframe Without `sandbox` Attribute — **FIXED**

**File:** `src/pages/user/VideoIframe.tsx` (lines 45–54)

**Problem:**
An `<iframe>` loads a URL received from the API without a `sandbox` attribute. The embedded page can execute arbitrary scripts, navigate the top-level window, submit forms, and access browser APIs. If the iframe source is ever compromised or the URL is manipulated, the attacker has full execution within the user's session.

**Fix:**

- Add a `sandbox` attribute with the minimum required permissions. For a video stream, this is typically: `sandbox="allow-scripts allow-same-origin"`. Avoid `allow-top-navigation` and `allow-forms` unless strictly needed.
- **Validate the iframe URL** before rendering. Maintain an allowlist of trusted domains (or URL patterns) and reject anything that doesn't match.
- Consider adding a `referrerPolicy="no-referrer"` attribute to prevent leaking page context to the embedded site.

**Status:** Implemented. The iframe now has `sandbox="allow-scripts allow-same-origin"` and `referrerPolicy="no-referrer"`. URL validation is in `src/lib/iframe.ts` (allowlist with default `https://cctv.yarchang.net`; override via `VITE_IFRAME_ALLOWED_ORIGINS`). Disallowed or invalid URLs show "Stream unavailable" and the iframe loads `about:blank`.

---

### 5. Hardcoded External URL in Source Code — ⚠️ UNFIXED

**File:** `src/pages/user/Login.tsx` (around line 228)

**Problem:**
A long external URL (`https://tkytzw1.5tv9ctzx.com/...`) is hardcoded directly in the component. This URL is visible to anyone who inspects the JavaScript bundle. If it is a service endpoint or contains a key/token, it is exposed.

**Fix:**

- Move the URL to an environment variable (e.g., `VITE_EXTERNAL_SERVICE_URL`) and reference it via `import.meta.env.VITE_EXTERNAL_SERVICE_URL`.
- Add the `.env` file containing this variable to `.gitignore` (already done for `.env`).
- Review whether this URL contains sensitive path segments that should not be in client code at all. If so, proxy the request through your own backend so the external URL is never exposed to the browser.

---

## MEDIUM

### 6. No CSRF Protection — **FIXED**

**File:** `src/api/axios.ts`

**Problem:**
API requests use a Bearer token in the `Authorization` header. While this provides some natural CSRF resistance (the header must be explicitly set by JavaScript), there are no CSRF tokens and no `SameSite` cookie strategy. Auth has now been migrated to httpOnly cookies (see issue #2), so CSRF is a relevant concern.

**Fix:**

- If using cookies for auth: set cookies with `SameSite=Strict` (or `Lax`) and `Secure` flags. Additionally, implement a server-side CSRF token mechanism (e.g., double-submit cookie pattern or synchronizer token).
- If staying with Bearer tokens in headers: the current approach is reasonably CSRF-safe, but add a Content Security Policy to reduce the risk of XSS (which is the main threat to Bearer tokens).

**Status:** Fully fixed with two layers of CSRF protection:

1. **SameSite=Strict** — Auth cookies are set with `SameSite=Strict` and `Secure` (in production), blocking cross-site cookie transmission.
2. **Double-submit cookie** — A cryptographically random CSRF token is generated at login, stored in an httpOnly cookie (`csrf_token`) and returned in the login response body. The client stores it in memory (React Context via `CsrfContext`) and sends it on every state-changing request (POST/PUT/PATCH/DELETE) via the `X-CSRF-Token` header. Server middleware (`csrf.middleware.js`) verifies the cookie value matches the header value using constant-time comparison. Token is cleared on logout and 401.

---

### 7. Unsanitized API Content Rendered in the DOM — ⚠️ UNFIXED

**File:** `src/pages/user/Home.tsx` (around line 321)

**Problem:**
Announcement content from the API (`currentAnnounce.content`) is rendered directly in JSX. React's default escaping prevents basic XSS when using `{variable}` syntax, but this protection breaks if:

- The content is ever rendered via `dangerouslySetInnerHTML`.
- The API is compromised and returns malicious payloads.
- Future developers change the rendering approach.

**Fix:**

- Add a sanitization library like **DOMPurify** to the project.
- Before rendering any user-generated or API-sourced content, pass it through `DOMPurify.sanitize()`.
- Audit the entire codebase for any other locations where API data is rendered and apply the same sanitization.
- Establish a project convention: all API-sourced text that could contain markup must be sanitized before rendering.

---

### 8. URL Parameters Used Without Validation — ⚠️ UNFIXED

**Files:** Multiple files in `src/pages/admin/` (TopUp.tsx, ModifyStatus.tsx, InfoUpdate.tsx, RedLimitConfiguration.tsx, UserChangePassword.tsx, NickName.tsx, AutoSettleRebate.tsx, cameras/form.tsx, desks/form.tsx, scanners/form.tsx, and others)

**Problem:**
Route parameters from `useParams()` are passed directly to API calls (e.g., `Number(id)`) without validation. A crafted URL could pass `NaN`, negative numbers, or excessively large values.

**Fix:**

- Create a shared validation utility that checks route params before use: verify the value is a positive integer within expected bounds.
- If validation fails, redirect to an error page or the parent list page instead of making an API call with bad data.
- **Server-side validation is the primary defense** — ensure the backend validates and sanitizes all IDs received in requests.

---

### 9. Weak Client-Side Authentication Check ✅ FIXED

**File:** `src/layouts/user/Main.tsx` (lines 9–19)

**Problem:**
The auth guard only checks if `playerID` and `token` **exist** in storage. Following the httpOnly cookie migration (issue #2), the client no longer has access to the token; the guard now checks only `playerID` from `sessionStorage`. It still does not validate whether the session (cookie) is expired or revoked — an invalid or expired cookie will appear "authenticated" until an API call fails with 401.

**Fix (implemented):**

- Added a lightweight `GET /api/auth/player_verify` endpoint on the server (`server/controllers/user/auth.controller.js`, `server/routes/user/auth.routes.js`). The route uses the existing `protect` middleware which validates the JWT from the httpOnly cookie (signature, expiry, user existence, `token_version` match). The handler simply returns `{ valid: true, id }`.
- On layout mount in `src/layouts/user/Main.tsx`, the component now calls `playerVerify()` (defined in `src/api/user/playerAuth.ts`) before rendering. A `verifying` state prevents the authenticated page from flashing while the check runs.
- If the server returns 401, the existing Axios response interceptor triggers `handleGlobalLogout()`, which clears `sessionStorage` and redirects to `/login` — no additional client-side error handling was needed.

---

### 10. No Content Security Policy (CSP) — ⚠️ UNFIXED

**Problem:**
There is no Content Security Policy configured for the application. CSP is a browser-level defense that restricts which scripts, styles, images, and iframes can load. Without it, XSS attacks are significantly easier to exploit.

**Fix:**

- Add CSP headers via the server (preferred) or as a `<meta>` tag in `index.html`.
- A reasonable starting policy:
  - `default-src 'self'`
  - `script-src 'self'` (avoid `'unsafe-inline'` and `'unsafe-eval'`)
  - `style-src 'self' 'unsafe-inline'` (Tailwind may require inline styles)
  - `img-src 'self' data:`
  - `frame-src` restricted to trusted video stream domains only
  - `connect-src 'self'` plus your API and WebSocket origins
- Test thoroughly after adding CSP — it can break legitimate functionality if too restrictive.

---

## LOW

### 11. Sensitive Data in `console.log` — ⚠️ UNFIXED

**File:** `src/pages/admin/game_management/RateLimitManagement.tsx` (line 446)

**Problem:**
`console.log("Payload to submit:", payload)` outputs potentially sensitive data to the browser console in all environments.

**Fix:**

- Remove debug `console.log` statements before merging to production.
- Alternatively, configure the Vite build to strip `console.log` calls in production using a plugin like `vite-plugin-remove-console` or Terser's `drop_console` option.
- Audit the entire codebase for other `console.log` statements that may leak sensitive information.

---

### 12. HTTP Used in Development Configuration — ⚠️ UNFIXED

**Files:** `src/api/axios.ts` (line 9), `src/utils/Sesssion.ts` (line 15)

**Problem:**
Development mode uses `http://localhost:3001/api`. While expected for local development, if the production check ever fails or is bypassed, requests would be sent over unencrypted HTTP.

**Fix:**

- Move the base URL to an environment variable (`VITE_API_BASE_URL`) in both files instead of hardcoding it.
- Ensure the production deployment enforces HTTPS via server configuration (HSTS headers, redirect HTTP to HTTPS).
- Add a runtime check: if `window.location.protocol` is `https:` but the API URL starts with `http:`, log a warning or block the request.

---

### 13. Filename Typo: `Sesssion.ts` — ⚠️ UNFIXED

**File:** `src/utils/Sesssion.ts` (triple "s")

**Problem:**
The filename has a typo (`Sesssion` instead of `Session`). While not a security vulnerability, inconsistent naming causes confusion during code reviews and makes it harder to grep for session-related code during security audits.

**Fix:**

- Rename `src/utils/Sesssion.ts` to `src/utils/Session.ts`.
- Update all import statements that reference this file.

---

---

### 14. `loginUser` Still Read from localStorage — ⚠️ UNFIXED

**File:** `src/api/axios.ts` (line 54)

**Problem:**
The Axios request interceptor reads `loginUser` from `localStorage`:
```ts
const stored = localStorage.getItem("loginUser");
const loginUser = stored ? JSON.parse(stored) : null;
```

Per the security fix for issue #2, non-sensitive session data was supposed to be moved from `localStorage` to `sessionStorage`. The `loginUser` object contains the user's `role` which is used to determine whether to send the `x-client-page` header for sub-account permission checks. Since this is in `localStorage`, it persists across browser sessions and could be tampered with to bypass the client-side role check.

**Fix:**
- Change `localStorage.getItem("loginUser")` to `sessionStorage.getItem("loginUser")`.
- Ensure the login pages write `loginUser` to `sessionStorage` instead of `localStorage`.
- Verify that the `handleGlobalLogout` function in the same file clears `loginUser` from `sessionStorage` (it currently clears `sessionStorage` entirely via `sessionStorage.clear()`, so this should work).

---

### 15. sendBeacon Logout Bypasses CSRF Protection — ⚠️ UNFIXED

**File:** `src/utils/Sesssion.ts` (lines 24–27)

**Problem:**
The tab-close handler uses `navigator.sendBeacon(url, params)` to call the player logout endpoint. `sendBeacon` sends the request as `application/x-www-form-urlencoded` and does **not** allow setting custom headers. This means:

1. The `X-CSRF-Token` header required by the CSRF middleware is never sent.
2. The CSRF cookie is sent automatically (since `sendBeacon` includes cookies for same-origin), but without the header, the double-submit check fails.
3. Currently this works only because the logout route is mounted under `/api/auth` which skips both auth and CSRF middleware — but this is exactly the problem described in server issue #8 (unauthenticated logout).

**Fix:**
- **Short-term:** If the logout endpoint remains unauthenticated and CSRF-exempt (under `/api/auth`), `sendBeacon` will continue to work but the server should at least validate the `userId` against the auth cookie (see server SECURITY_FIXES.md #8).
- **Long-term:** Move logout to a protected route. Replace `sendBeacon` with `fetch(url, { method: "POST", keepalive: true, credentials: "include", headers: { "X-CSRF-Token": csrfToken } })`. The `keepalive: true` flag ensures the request completes even as the page unloads (similar to `sendBeacon`).
- Note: the CSRF token is stored in React Context memory and cleared on unmount, so accessing it in the `beforeunload` handler requires storing a copy in a module-level variable.

---

### 16. Socket Connection Has No Authentication — ✅ FIXED

**File:** `src/lib/socket.ts`

**Problem:**
The Socket.IO client connected without the server validating authentication. While `withCredentials: true` sends cookies, the server's Socket.IO did not validate them (see server SECURITY_FIXES.md #3).

**Fix applied:**
- No client change required. The JWT is in an httpOnly cookie, so the client cannot (and should not) read it. The server now validates the connection by reading `auth_token` from `socket.handshake.headers.cookie` in `server/socket/auth.middleware.js`. The existing `withCredentials: true` ensures the cookie is sent on the Socket.IO handshake; unauthenticated connections are rejected by the server.

---

## Priority Order for Fixes

| Priority | Issue #                                                              | Effort | Impact                                   |
| -------- | -------------------------------------------------------------------- | ------ | ---------------------------------------- |
| 1st      | #1 — Remove password from localStorage — **FIXED**                   | —      | Eliminates credential theft risk         |
| 2nd      | #3 — Add admin/operator auth guards                                  | Low    | Prevents unauthorized page access        |
| 3rd      | #16 — Authenticate socket connection — **FIXED**                     | —      | Prevents eavesdropping on game events    |
| 4th      | #14 — Move loginUser to sessionStorage                               | Low    | Completes localStorage cleanup           |
| 5th      | #15 — Fix sendBeacon CSRF bypass                                     | Medium | Closes CSRF gap on logout                |
| 6th      | #5 — Move hardcoded URL to env var                                   | Low    | Hides sensitive endpoint                 |
| 7th      | #11 — Remove console.log                                             | Low    | Stops data leaking to console            |
| 8th      | #4 — Sandbox the iframe — **FIXED**                                  | —      | Limits iframe attack surface             |
| 9th      | #9 — Server-side token validation on mount — **FIXED**               | —      | Catches expired/revoked sessions         |
| 10th     | #2 — Migrate tokens to httpOnly cookies — **FIXED**                  | —      | Eliminates token theft via XSS           |
| 11th     | #8 — Validate URL params                                             | Medium | Hardens admin pages                      |
| 12th     | #10 — Add Content Security Policy                                    | Medium | Broad XSS mitigation                     |
| 13th     | #6 — Add CSRF protection — **FIXED**                                 | —      | Full double-submit mechanism             |
| 14th     | #7 — Add DOMPurify for API content                                   | Low    | Defense-in-depth for XSS                 |
| 15th     | #12 — Use env vars for base URL                                      | Low    | Cleaner configuration                    |
| 16th     | #13 — Fix filename typo                                              | Low    | Code hygiene                             |
