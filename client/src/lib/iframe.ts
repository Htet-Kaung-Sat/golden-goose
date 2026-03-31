/**
 * Allowlist for iframe origins (camera/stream URLs).
 * Comma-separated env VITE_IFRAME_ALLOWED_ORIGINS overrides this.
 * Add more origins here or set the env for production.
 */
const DEFAULT_ALLOWED_ORIGINS: string[] = [
  "https://cctv.yarchang.net",
];

/**
 * Returns the list of origins allowed for video iframes.
 * Uses VITE_IFRAME_ALLOWED_ORIGINS when set (comma-separated), else DEFAULT_ALLOWED_ORIGINS.
 */
export function getAllowedIframeOrigins(): string[] {
  const env = import.meta.env.VITE_IFRAME_ALLOWED_ORIGINS;
  if (typeof env === "string" && env.trim()) {
    return env.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return [...DEFAULT_ALLOWED_ORIGINS];
}

/**
 * Returns true if the URL's origin is in the allowlist. Rejects invalid URLs.
 */
export function isAllowedIframeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    const allowed = getAllowedIframeOrigins();
    return allowed.includes(parsed.origin);
  } catch {
    return false;
  }
}
