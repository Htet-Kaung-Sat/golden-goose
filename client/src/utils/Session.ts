export const setupTabCloseListener = () => {
  const handleTabClose = () => {
    const storedId = sessionStorage.getItem("playerID");
    if (!storedId) return;

    try {
      const playerId = JSON.parse(storedId);

      if (playerId) {
        const isProduction = import.meta.env.MODE === "production";
        const url = isProduction
          ? "/api/auth/player_logout"
          : `${import.meta.env.VITE_API_BASE_URL}/api/auth/player_logout`;
        const params = new URLSearchParams();
        params.append("userId", playerId.toString());
        navigator.sendBeacon(url, params);
        sessionStorage.clear();
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("pendingBets")) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.error("Session cleanup failed", e);
    }
  };

  window.addEventListener("beforeunload", handleTabClose);
  return () => window.removeEventListener("beforeunload", handleTabClose);
};
