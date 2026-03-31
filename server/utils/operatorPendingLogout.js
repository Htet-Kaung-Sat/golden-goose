/**
 * Operator tab-close logout: delay actual logout so we can cancel on refresh.
 * - Beacon hits → token added to pending with 2s timeout.
 * - If another request (e.g. after refresh) comes within 2s, we cancel pending (onExpire not run).
 * - If timeout fires (tab closed), onExpire(token) is called, then token is blacklisted.
 */
const PENDING_MS = 1000;

const pendingLogout = new Map(); // token -> { timeoutId, onExpire? }
const blacklist = new Set();

/**
 * @param {string} token
 * @param {{ onExpire?: (token: string) => void }} [opts] - onExpire runs only when the timeout fires (tab closed), not on refresh
 */
function addPending(token, opts = {}) {
  if (!token || typeof token !== "string") return;
  if (pendingLogout.has(token)) {
    const prev = pendingLogout.get(token);
    clearTimeout(prev.timeoutId);
  }
  const timeoutId = setTimeout(() => {
    const entry = pendingLogout.get(token);
    if (entry?.onExpire && typeof entry.onExpire === "function") {
      try {
        entry.onExpire(token);
      } catch (err) {
        console.error("operatorPendingLogout onExpire error:", err);
      }
    }
    blacklist.add(token);
    pendingLogout.delete(token);
  }, PENDING_MS);
  pendingLogout.set(token, { timeoutId, onExpire: opts.onExpire });
}

function cancelPending(token) {
  if (!token) return;
  const entry = pendingLogout.get(token);
  if (entry) {
    clearTimeout(entry.timeoutId);
    pendingLogout.delete(token);
  }
}

function isBlacklisted(token) {
  return token ? blacklist.has(token) : false;
}

module.exports = {
  addPending,
  cancelPending,
  isBlacklisted,
};
