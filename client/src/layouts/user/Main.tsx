import { GameProvider } from "@/contexts/GameContext";
import { Outlet, useNavigate } from "react-router-dom";
import { getSocket } from "@/lib/socket";
import { useEffect, useState } from "react";
import { CardBoardProvider } from "@/contexts/CardBoardContext";
import { NiuniuCardBoardProvider } from "@/contexts/NiuniuCardBoardContext";
import { ForbiddenProvider } from "@/contexts/ForbiddenContext";
import { playerVerify } from "@/api/user/playerAuth";
import PageLoader from "@/components/loading/PageLoader";
import IdleReloadDialog from "@/components/shared/IdleReloadDialog";
import { useIdleReload } from "@/hooks/useIdleReload";

const IDLE_RELOAD_MS = 180_000;

const Main = () => {
  const playerID = Number(sessionStorage.getItem("playerID"));
  const navigate = useNavigate();
  const isAuthed = Boolean(playerID);
  const [verifying, setVerifying] = useState(true);
  const { isIdle } = useIdleReload({
    idleMs: IDLE_RELOAD_MS,
    enabled: isAuthed && !verifying,
  });

  useEffect(() => {
    if (!isAuthed) {
      navigate("/login", { replace: true });
      setVerifying(false);
      return;
    }
    playerVerify()
      .then(() => setVerifying(false))
      .catch(() => setVerifying(false));
  }, [isAuthed, navigate]);

  useEffect(() => {
    if (!isAuthed) return;
    const socket = getSocket();
    const handleForceLogout = (userId: number) => {
      if (userId === playerID) {
        sessionStorage.clear();
        navigate("/login");
      }
    };

    socket.on("online_player:force_logout", handleForceLogout);
    return () => {
      socket.off("online_player:force_logout", handleForceLogout);
    };
  }, [isAuthed, playerID, navigate]);

  if (verifying || !isAuthed) {
    return <PageLoader />;
  }
  return (
    <ForbiddenProvider>
      <GameProvider>
        <NiuniuCardBoardProvider>
          <CardBoardProvider>
            <div>
              {/* dialog for idle reload when user is idle for IDLE_RELOAD_MS */}
              <IdleReloadDialog
                open={isIdle}
                onReload={() => window.location.reload()}
              />
              <main className="select-none">
                <Outlet />
              </main>
            </div>
          </CardBoardProvider>
        </NiuniuCardBoardProvider>
      </GameProvider>
    </ForbiddenProvider>
  );
};

export default Main;
