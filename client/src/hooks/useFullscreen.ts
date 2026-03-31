import { useEffect } from "react";

/**
 * Enters fullscreen on mount (with 500ms delay to avoid Chrome password dialog conflicts)
 * and exits fullscreen on unmount (e.g. logout navigation).
 */
export const useFullscreen = () => {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (!document.fullscreenElement) {
      timer = setTimeout(() => {
        document.documentElement.requestFullscreen().catch(() => {});
      }, 500);
    }
    return () => {
      clearTimeout(timer);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);
};
