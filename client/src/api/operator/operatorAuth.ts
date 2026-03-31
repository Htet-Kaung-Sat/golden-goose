import API from "../axios";

export const operatorLogin = async (payload: {
  account: string;
  password: string;
  desk_no: string;
}) => {
  const { data } = await API.post("/auth/operator_login", payload);
  return data;
};

export const operatorVerify = async () => {
  const { data } = await API.get("/operator/auth/verify");
  return data;
};

export const operatorLogout = async () => {
  const { data } = await API.post("/operator/auth/logout");
  return data;
};

const getOperatorApiBase = (): string => {
  const isProduction = import.meta.env.MODE === "production";
  return isProduction
    ? "/api"
    : `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;
};

/**
 * Fire-and-forget logout via sendBeacon (works during tab close / beforeunload).
 * Uses /logout-beacon so the server can delay logout and cancel on refresh (no CSRF on beacon).
 */
export const operatorLogoutBeacon = (): void => {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  const base = getOperatorApiBase();
  const url = `${base}/operator/auth/logout-beacon`;
  navigator.sendBeacon(url);
};

const OPERATOR_UNLOAD_KEY = "operator_unload_at";

/**
 * Registers a beforeunload/pagehide listener that sends a logout beacon.
 * Server delays actual logout by ~2s; if the next request (e.g. after refresh) comes within that window,
 * the session is kept. If the tab is closed, no request follows and the session is ended.
 * Call this once when the operator app mounts (e.g. in Main layout after verify).
 */
export const setupOperatorUnloadListener = (): (() => void) => {
  const handler = () => {
    sessionStorage.setItem(OPERATOR_UNLOAD_KEY, String(Date.now()));
    operatorLogoutBeacon();
  };
  window.addEventListener("beforeunload", handler);
  window.addEventListener("pagehide", handler);
  return () => {
    window.removeEventListener("beforeunload", handler);
    window.removeEventListener("pagehide", handler);
  };
};
