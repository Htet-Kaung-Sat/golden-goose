import axios, { type AxiosError } from "axios";
import i18n from "@/i18n";

function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const isProduction = import.meta.env.MODE === "production";
const baseURL = isProduction
  ? "/api"
  : `${import.meta.env.VITE_API_BASE_URL}/api`;

const API = axios.create({
  baseURL,
  withCredentials: true, // [SECURITY FIX] Send httpOnly auth cookie with every request
});

/** Auth error codes returned by the server */
export const AUTH_ERROR = {
  TOKEN_INVALID: "TOKEN_INVALID",
  PROHIBITED_ACCESS: "PROHIBITED_ACCESS",
  ILLEGAL_ACCESS: "ILLEGAL_ACCESS",
  FORBIDDEN: "FORBIDDEN",
} as const;

/** Custom event dispatched when a user page receives 403 FORBIDDEN (role not allowed). */
export const USER_FORBIDDEN_EVENT = "user-forbidden";

/** Custom event dispatched when admin or operator page receives 403 FORBIDDEN (role not allowed). */
export const ADMIN_OPERATOR_FORBIDDEN_EVENT = "admin-operator-forbidden";

export const handleGlobalLogout = (): void => {
  sessionStorage.clear();
  Object.keys(localStorage).forEach((key) => {
    if (
      key !== "rememberedAccount" &&
      key !== "remember" &&
      key !== "remember_account"
    ) {
      localStorage.removeItem(key);
    }
  });
  const path = window.location.pathname;
  if (path.includes("/admin")) {
    i18n.changeLanguage("zh");
    window.location.href = "/admin/login";
  } else if (path.includes("/operator")) {
    window.location.href = "/operator/login";
  } else {
    window.location.href = "/login";
  }
};

API.interceptors.request.use(
  async (config) => {
    // [SECURITY FIX] Attach CSRF token header for state-changing requests (POST/PUT/PATCH/DELETE).
    // The httpOnly csrf_token cookie is sent automatically by the browser;
    // the server compares it against this header value.
    const method = config.method?.toLowerCase();
    if (method && ["post", "put", "patch", "delete"].includes(method)) {
      const csrfToken = getCsrfTokenFromCookie();
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    // [SECURITY FIX] Removed localStorage token + Bearer header.
    // The httpOnly cookie is now sent automatically via withCredentials.
    const stored = localStorage.getItem("loginUser");
    const loginUser = stored ? (JSON.parse(stored) as { role?: string }) : null;
    if (loginUser?.role === "sub_account") {
      const routePath = window.location.pathname;
      const trimmed = routePath.replace(/\/$/, "");
      const currentPath = trimmed.endsWith("/admin")
        ? "admin"
        : (() => {
            const segments = routePath.split("/").filter(Boolean);
            const adminIndex = segments.indexOf("admin");
            return adminIndex !== -1 ? (segments[adminIndex + 1] ?? "") : "";
          })();
      config.headers["x-client-page"] = currentPath;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

API.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const status = error.response?.status;
    const code = error.response?.data?.error;
    const message = error.response?.data?.message;
    if (status === 403 && code === AUTH_ERROR.PROHIBITED_ACCESS) {
      return Promise.reject("prohibited");
    }
    if (status === 403 && code === AUTH_ERROR.ILLEGAL_ACCESS) {
      return Promise.reject("illegal");
    }
    if (status === 403 && code === AUTH_ERROR.FORBIDDEN) {
      const path = window.location.pathname;
      const isUserPage =
        !path.includes("/admin") && !path.includes("/operator");
      if (isUserPage) {
        window.dispatchEvent(
          new CustomEvent(USER_FORBIDDEN_EVENT, {
            detail: { message: message ?? "Access denied for this role" },
          }),
        );
      } else if (path.includes("/admin") || path.includes("/operator")) {
        window.dispatchEvent(
          new CustomEvent(ADMIN_OPERATOR_FORBIDDEN_EVENT, {
            detail: { message: message ?? "Access denied for this role" },
          }),
        );
      }
      return Promise.reject(error);
    }
    if (status === 401 && code === AUTH_ERROR.TOKEN_INVALID) {
      handleGlobalLogout();
    }
    return Promise.reject(error);
  },
);

export default API;
