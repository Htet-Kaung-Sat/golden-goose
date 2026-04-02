import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { Icons } from "@/components/ui/icons";
import { Desk, Game } from "@/types";
import NiuniuResultTable from "./niuniu/ResultTable";
import NiuniuCardBoard from "./niuniu/CardBoard";
import NResultTable from "./baccarat_n/ResultTable";
import BResultTable from "./baccarat_b/ResultTable";
import GResultTable from "./baccarat_g/ResultTable";
import CardBoard from "./baccarat_g/CardBoard";
import LonghuResultTable from "./longhu/ResultTable";
import LonghuCardBoard from "./longhu/CardBoard";
import { getSocket } from "@/lib/socket";
import { useGameContext } from "@/contexts/GameContext";
import ReportDialog from "./ReportDialog";
import HelpDialog from "./HelpDialog";
import SettingsDialog from "./SettingsDialog";
import { cn } from "@/lib/utils";
import { getRateLimit } from "@/utils/helper";
import VideoIframe from "./VideoIframe";
import { getLastRoundStatus } from "@/api/user";
import { AnimatePresence, motion } from "framer-motion";
import FullscreenToggleButton from "@/components/shared/FullscreenToggleButton";
import RateLimitDialog from "./RateLimitDialog";

interface GamePlayerProps {
  desk: Desk;
  cameras: string[];
  onBack: () => void;
  game: Game;
  openRateLimit?: boolean;
  setOpenRateLimit?: React.Dispatch<React.SetStateAction<boolean>>;
}

const GamePlayer: React.FC<GamePlayerProps> = ({
  desk,
  onBack,
  cameras,
  game,
  openRateLimit: openRateLimitProp,
  setOpenRateLimit: setOpenRateLimitProp,
}) => {
  const [showInfo, setShowInfo] = useState(true);
  const [deskTimer, setDeskTimer] = useState(0);
  const [openReport, setOpenReport] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openRateLimitInternal, setOpenRateLimitInternal] = useState(false);
  const openRateLimit =
    openRateLimitProp !== undefined ? openRateLimitProp : openRateLimitInternal;
  const setOpenRateLimit = setOpenRateLimitProp ?? setOpenRateLimitInternal;
  const [cameraIndex, setCameraIndex] = useState(0);
  const { status, setStatus, setStatusDeskId, betBalance, user, refreshKey } =
    useGameContext();

  useEffect(() => {
    const fetchLastRoundStatus = async () => {
      if (!desk.desk_no) return;
      try {
        const result = await getLastRoundStatus(desk.id);
        setStatus(result.data.lastRound.status);
        setStatusDeskId(desk.id);
      } catch (error) {
        console.error("Error fetching last round status", error);
      }
    };
    fetchLastRoundStatus();
  }, [desk, refreshKey]);

  useEffect(() => {
    const socket = getSocket();

    const timerEvent = `desk:${desk.id}:updateTimer`;
    const statusEvent = `desk:${desk.id}:updateStatus`;

    const handleTimer = (t: number) => {
      setDeskTimer(t);
    };

    const handleStatus = (s: string) => {
      setStatus(s);
      setStatusDeskId(desk.id);
    };

    socket.on(timerEvent, handleTimer);
    socket.on(statusEvent, handleStatus);

    return () => {
      socket.off(timerEvent, handleTimer);
      socket.off(statusEvent, handleStatus);
    };
  }, [desk]);

  useEffect(() => {
    setCameraIndex(0);
  }, [desk.id]);

  const handleSwapCamera = () => {
    if (cameras.length <= 1) return;
    setCameraIndex((prev) => (prev + 1) % cameras.length);
  };

  const statusName = () => {
    if (status === "betting") return deskTimer;
    if (status === "dealing") return "开牌";
    if (status === "finished") return "派彩";
    if (status === "active") return "派彩";
  };

  return (
    <div className="relative flex flex-col w-full h-full bg-black overflow-hidden">
      <div className="absolute top-15 left-100 transform -translate-x-1/2 w-28 h-28 z-50">
        {status === "betting" ? (
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="48"
                stroke="rgba(0,0,0,0.8)"
                strokeWidth="6"
                fill="rgba(0,0,0,0.6)"
              />
              <circle
                cx="50%"
                cy="50%"
                r="48"
                stroke={`url(#gradientStroke)`}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="301"
                strokeDashoffset={301 - (deskTimer / 30) * 301}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
              <defs>
                <linearGradient id="gradientStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#FF0000" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute text-white text-3xl font-bold">
              {deskTimer}
            </span>
          </div>
        ) : (
          <div className="w-28 h-28 rounded-full bg-black/70 text-white flex items-center justify-center border border-black text-xl font-bold">
            {statusName()}
          </div>
        )}
      </div>
      <div className="relative flex-grow w-full overflow-hidden bg-black">
        <div className="absolute inset-0">
          {cameras.length > 0 ? (
            <VideoIframe src={cameras[cameraIndex]} isGamePlayer />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-gray-400">
              No Camera
            </div>
          )}
        </div>

        <div
          className={cn(
            "absolute top-1 gap-2 right-2 flex flex-col items-end",
            openRateLimit ? "z-[60]" : "z-40",
          )}
        >
          <div className="flex gap-2 px-2 py-1 bg-gradient-to-b from-green-900/90 to-green-800/70 rounded-bl-lg">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-yellow-500 hover:scale-140 px-1 transition-transform"
            >
              <Icon
                icon={
                  showInfo
                    ? "mdi:arrow-down-drop-circle"
                    : "mdi:arrow-up-drop-circle"
                }
                width="45"
                className="cursor-pointer"
              />
            </button>
            <button
              onClick={handleSwapCamera}
              className="text-[#d29b24] transform transition-transform duration-200 hover:scale-140 relative cursor-pointer"
            >
              <Icon icon="mdi:web-camera" width="45" />
              <span className="absolute top-[17px] left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white text-[12px] border-1 border-amber-400 rounded-full w-4 h-4 flex items-center justify-center">
                {cameraIndex + 1}
              </span>
            </button>
            <button
              onClick={() => setOpenReport(true)}
              className="text-[#d29b24] transform transition-transform duration-200 hover:scale-140"
            >
              <Icon icon="uim:calender" width="45" className="cursor-pointer" />
            </button>
            <button
              onClick={() => setOpenHelp(true)}
              className="text-yellow-500 hover:scale-140 px-1 transition-transform"
            >
              <Icon
                icon="solar:question-circle-bold"
                width="45"
                className="cursor-pointer"
              />
            </button>
            <FullscreenToggleButton />
            <button
              onClick={() => setOpenSettings(true)}
              className="text-yellow-500 hover:scale-140 px-1 transition-transform"
            >
              <Icon
                icon="lsicon:setting-filled"
                width="45"
                className="cursor-pointer"
              />
            </button>
            <button
              onClick={() => onBack()}
              className="text-yellow-500 hover:scale-140 px-1 transition-transform"
            >
              <Icon
                icon="ion:arrow-redo"
                width="45"
                className="cursor-pointer"
              />
            </button>
          </div>

          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, y: -20, scaleY: 0.8 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -20, scaleY: 0.8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-green-900/90 text-yellow-100 text-xl p-3 rounded-bl-xl w-70 shadow-lg border border-yellow-700 origin-top flex flex-col"
              >
                <div className="flex justify-between p-1">
                  <span>房间：</span>
                  <span className="font-semibold">{desk.name}</span>
                </div>
                <div
                  className={`flex justify-between p-1 ${desk.game?.type === "BACCARAT" ? "bg-white/20" : ""}`}
                >
                  <span>场次：</span>
                  <span className="font-semibold">
                    第{desk?.session?.session_no}-{desk?.last_round?.round_no}局
                  </span>
                </div>
                <div className="flex items-center justify-between p-1">
                  <span className="flex items-center">
                    限红：
                    <button
                      type="button"
                      onClick={() => setOpenRateLimit((prev) => !prev)}
                      className="inline-flex items-center justify-center cursor-pointer hover:opacity-80 focus:outline-none"
                      aria-label="查看限红说明"
                    >
                      <Icons.circleAlert
                        size={22}
                        className="text-yellow-400 cursor-pointer"
                      />
                    </button>
                  </span>

                  <span className="font-semibold flex items-center gap-1">
                    {(user &&
                      getRateLimit(user, desk.game_id)?.min_bet +
                        "-" +
                        getRateLimit(user, desk.game_id)?.max_bet) ||
                      "0 - 0"}
                  </span>
                </div>
                <div
                  className={`flex justify-between p-1 ${desk.game?.type === "BACCARAT" ? "bg-white/20" : ""}`}
                >
                  <span>余额：</span>
                  <span className="font-semibold">{user?.balance}</span>
                </div>
                <div className="flex justify-between p-1">
                  <span>已下注：</span>
                  <span className="font-semibold">{betBalance}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {openRateLimit && (
            <RateLimitDialog
              open={openRateLimit}
              onClose={() => setOpenRateLimit(false)}
              desk={desk}
              game={game}
              user={user ?? null}
              inline
            />
          )}
        </div>
      </div>

      <div className="w-full shrink-0 z-20">
        {desk?.game?.type === "NIUNIU" && (
          <div className="absolute bottom-0 border-neutral-700 left-0 w-full">
            <div className="absolute bottom-0 left-0 w-full z-10">
              <NiuniuCardBoard desk={desk} />
            </div>
            <NiuniuResultTable
              desk={desk}
              game={game}
              onSwapCamera={handleSwapCamera}
            />
          </div>
        )}

        {desk.game?.type === "BACCARAT" && (
          <div className="absolute bottom-0 border-neutral-700 left-0 w-full">
            {desk?.baccarat_type === "N" && (
              <NResultTable
                desk={desk}
                game={game}
                onSwapCamera={handleSwapCamera}
              />
            )}
            {desk?.baccarat_type === "G" && (
              <div className="relative w-full">
                <GResultTable
                  desk={desk}
                  game={game}
                  onSwapCamera={handleSwapCamera}
                />
                <div className="absolute bottom-0 left-0 w-full z-50 pointer-events-none">
                  <CardBoard desk={desk} />
                </div>
              </div>
            )}
            {desk?.baccarat_type === "B" && (
              <BResultTable
                desk={desk}
                game={game}
                onSwapCamera={handleSwapCamera}
              />
            )}
          </div>
        )}

        {desk?.game?.type === "LONGHU" && (
          <div className="absolute bottom-0 border-neutral-700 left-0 w-full">
            <LonghuResultTable
              desk={desk}
              game={game}
              onSwapCamera={handleSwapCamera}
            />
            <div className="absolute bottom-0 left-0 w-full">
              <LonghuCardBoard desk={desk} />
            </div>
          </div>
        )}
      </div>

      <ReportDialog open={openReport} onClose={() => setOpenReport(false)} />
      <HelpDialog open={openHelp} onClose={() => setOpenHelp(false)} />
      <SettingsDialog
        open={openSettings}
        onClose={() => setOpenSettings(false)}
      />
    </div>
  );
};

export default GamePlayer;
