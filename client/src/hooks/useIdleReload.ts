import { useEffect, useRef, useState } from "react";

type UseIdleReloadOptions = {
  idleMs: number;
  enabled?: boolean;
};

type UseIdleReloadResult = {
  isIdle: boolean;
};

/**
 * Idle = user has left the site (tab hidden), not "no activity on page".
 * Uses Page Visibility API: tab hidden when user switches tab, minimizes window, or (mobile) leaves the app.
 *
 * User events process:
 * - Tab becomes hidden (user switched tab / minimized): start a timer for idleMs.
 *   If the timer fires → set isIdle = true → reload dialog will show when user returns.
 * - Tab becomes visible (user came back): clear the timer.
 *   If user was already marked idle (timer fired while away), keep isIdle = true so the dialog stays until they click Reload.
 *   If user came back before the timer fired, they were never idle → no dialog.
 * - While the user stays on the site (tab visible), we never start the timer → watching the game without interacting never triggers idle.
 */
export function useIdleReload({
  idleMs,
  enabled = true,
}: UseIdleReloadOptions): UseIdleReloadResult {
  const [isIdle, setIsIdle] = useState(false);
  const isIdleRef = useRef(false);
  const timeoutIdRef = useRef<number | null>(null);

  useEffect(() => {
    isIdleRef.current = isIdle;
  }, [isIdle]);

  useEffect(() => {
    if (!enabled) return;
    if (idleMs <= 0) return;

    const clearTimer = () => {
      if (timeoutIdRef.current == null) return;
      window.clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    };

    // Start countdown when user has left the site (tab hidden for idleMs).
    const schedule = () => {
      clearTimer();
      timeoutIdRef.current = window.setTimeout(() => {
        setIsIdle(true);
      }, idleMs);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the site: other tab, minimized, or (mobile) another app.
        // Start timer; if it fires, we mark idle and show reload dialog when they return.
        schedule();
      } else {
        // User came back to this tab. Clear the timer so we don't mark idle if they returned in time.
        // Do not set isIdle = false here: if they were already idle (timer fired while away),
        // keep dialog open until they click Reload.
        clearTimer();
      }
    };

    // If we mount while tab is already hidden (e.g. open in background), start the timer.
    if (document.hidden) {
      schedule();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, idleMs]);

  return { isIdle };
}
