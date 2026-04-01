import { DeskCardTables } from "@/components/shared/CommonCardTable";
import FullscreenToggleButton from "@/components/shared/FullscreenToggleButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGameContext } from "@/contexts/GameContext";
import { useScaleLayout } from "@/hooks/useScaleLayout";
import { useFullscreen } from "@/hooks/useFullscreen";
import { cn } from "@/lib/utils";
import { Camera, Desk, Game } from "@/types";
import { Icon } from "@iconify/react";
import React, { useEffect, useRef, useState, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import GamePlayer from "./GamePlayer";
import VideoIframe from "./VideoIframe";
import ReportDialog from "./ReportDialog";
import HelpDialog from "./HelpDialog";
import SettingsDialog from "./SettingsDialog";
import AgreementDialog from "./AgreementDialog";
import MultipleBet from "./MultipleBet";
import { playerLogout } from "@/api/user/playerAuth";
import {
  getAnnouncements,
  getCameras,
  getDesks,
  getGames,
  getUser,
} from "@/api/user";
import { getSocket } from "@/lib/socket";
import { Announce } from "@/types/Announce";
import { Loading, LoadingStep } from "@/components/loading/Loading";
import { getTotalPendingBetsAmount, wait } from "@/utils/helper";
import GamePlayerRightSideDesks from "./GamePlayerRightSideDesks";
import { detectAllGoodRoads } from "@/utils/goodRoad";

const TimeDisplay = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-3xl text-center text-gray-400">
      {time.toLocaleDateString()}
      <br />
      {time.toLocaleTimeString()}
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const playerID = Number(sessionStorage.getItem("playerID")); // [SECURITY FIX] Moved from localStorage to sessionStorage
  const [selectedGame, setSelectedGame] = useState<number>(0);
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [homeCameraUrls, setHomeCameraUrls] = useState<string[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const { user, setUser, refreshKey, setGoodRoads } = useGameContext();
  const [deskStatuses, setDeskStatuses] = useState<Record<number, string>>({});
  const isInitialRefreshableLoad = useRef(true);

  const [loadingStep, setLoadingStep] = useState<LoadingStep | null>(null);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  const scale = useScaleLayout();
  const [isMultipleBet, setIsMultipleBet] = useState(false);

  const [openReport, setOpenReport] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openAgreement, setOpenAgreement] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [balanceLoading, setbalanceLoading] = useState(false);
  const [currentAnnounce, setCurrentAnnounce] = useState<Announce | null>(null);
  const [showDeskPanel, setShowDeskPanel] = useState(false);
  const [openRateLimit, setOpenRateLimit] = useState(false);
  const socket = getSocket();
  const duration = Math.max(
    10,
    (currentAnnounce?.content?.length || 0) * 0.2 + 5,
  );

  useEffect(() => {
    const initialize = async () => {
      setLoadingStep("games");

      await fetchGames();
      setLoadingStep("cameras");

      await fetchCameras();
      setIsInitialDataLoaded(true);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialDataLoaded || !playerID) return;
    fetchUserAnnouncement();
    const fetchRefreshableData = async () => {
      if (isInitialRefreshableLoad.current) {
        setLoadingStep("player");
        await fetchPlayer(playerID);
        setLoadingStep("desks");
        await fetchDesks();

        // just for ui display
        setLoadingStep("last-one");
        await wait(400);
        setLoadingStep("last-two");
        await wait(400);
        setLoadingStep("done");
        await wait(400);
        setLoadingStep(null);
        isInitialRefreshableLoad.current = false;
      } else {
        await fetchPlayer(playerID);
        await fetchDesks();
      }
    };

    fetchRefreshableData();
  }, [isInitialDataLoaded, playerID, refreshKey]);

  useEffect(() => {
    if (!socket) return;

    const handleAnnouncement = (data: Announce) => {
      if (data.content) {
        setCurrentAnnounce(data);
      }
    };
    socket.on("user_announcement:change", handleAnnouncement);

    return () => {
      socket.off("user_announcement:change", handleAnnouncement);
    };
  });

  useFullscreen();

  // Track all desk statuses via socket
  useEffect(() => {
    if (!socket || desks.length === 0) return;
    const handlers: { event: string; handler: (s: string) => void }[] = [];
    for (const desk of desks) {
      const event = `desk:${desk.id}:updateStatus`;
      const handler = (s: string) => {
        setDeskStatuses((prev) => ({ ...prev, [desk.id]: s }));
      };
      socket.on(event, handler);
      handlers.push({ event, handler });
    }
    return () => {
      for (const { event, handler } of handlers) {
        socket.off(event, handler);
      }
    };
  }, [socket, desks]);

  // Recalculate good roads whenever desks data or statuses change
  useEffect(() => {
    if (desks.length > 0) {
      setGoodRoads(detectAllGoodRoads(desks, deskStatuses));
    }
  }, [desks, deskStatuses]);

  /** Fetches the list of games from API and updates state. */
  const fetchGames = async () => {
    try {
      const result = await getGames();
      setGames(result.data.games);
    } catch (error) {
      console.error("Error fetching games", error);
    }
  };

  /** Fetches the list of desks from API and updates state. */
  const fetchDesks = async () => {
    try {
      const result = await getDesks();
      setDesks(result.data.desks);
    } catch (error) {
      console.error("Error fetching desks", error);
    }
  };

  /** Fetches the latest user announcement and sets it as the current announce. */
  const fetchUserAnnouncement = async () => {
    try {
      const result = await getAnnouncements();
      const announcesData = result.data.announces;
      const contentData = announcesData[announcesData.length - 1];
      setCurrentAnnounce(contentData);
    } catch (error) {
      console.error("Error fetching announcement", error);
    }
  };

  /** Fetches cameras from API, sets home camera URLs (desk_id === null), and resets camera index. */
  const fetchCameras = async () => {
    try {
      const result = await getCameras();

      const cameras = result.data.cameras;
      setCameras(cameras);

      const homeCameras = cameras.filter(
        (camera: Camera) => camera.desk_id === null,
      );

      const urls = homeCameras.map((c: Camera) => c.url).filter(Boolean);

      setHomeCameraUrls(urls);
      setCameraIndex(0);
    } catch (error) {
      console.error("Error fetching cameras", error);
    }
  };

  useEffect(() => {
    if (!playerID) return;
    fetchPlayer(playerID);
    if (!socket) return;
    const handleTopupChange = () => {
      fetchPlayer(playerID);
    };
    socket.on("member_topup:change", handleTopupChange);

    return () => {
      socket.off("member_topup:change", handleTopupChange);
    };
  }, [socket, playerID, refreshKey]);

  /** Fetches the current player's user data by ID and updates the user context. */
  const fetchPlayer = async (playerID: number) => {
    try {
      const data = await getUser(playerID);
      const pendingTotal = getTotalPendingBetsAmount();
      setUser({
        ...data,
        balance: (data.balance ?? 0) - pendingTotal,
      });
    } catch (error) {
      console.error("Error fetching player", error);
    }
  };

  /** Sets the selected desk to show the game player view. */
  const handleSelectDesk = async (desk: Desk) => {
    setSelectedDesk(desk);
  };

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await playerLogout(Number(playerID));
    localStorage.removeItem("account");
    localStorage.removeItem("name");
    localStorage.removeItem("playerID");
    localStorage.removeItem("rememberedAccount");
    localStorage.removeItem("token");
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("pendingBets")) {
        localStorage.removeItem(key);
      }
    }
    navigate("/login");
  };

  /** Cycles to the next home camera in the list (no-op if only one camera). */
  const handleSwapCamera = () => {
    if (homeCameraUrls.length <= 1) return;

    setCameraIndex((prev) => (prev + 1) % homeCameraUrls.length);
  };

  const filteredDesks =
    selectedGame === 0
      ? desks
      : desks.filter((desk) => desk.game?.id === selectedGame);

  if (loadingStep !== null) {
    return <Loading loadingStep={loadingStep} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
      <div
        style={{
          width: "1920px",
          height: "1080px",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
        className="flex flex-col shrink-0 overflow-hidden"
      >
        {selectedDesk ? (
          (() => {
            const currentDesk = desks.find((d) => d.id === selectedDesk.id);
            const currentGame = games.find(
              (g) => g.id === selectedDesk.game_id,
            );
            return (
              <>
                <GamePlayerRightSideDesks
                  desks={desks}
                  onSelectDesk={handleSelectDesk}
                  showDeskPanel={showDeskPanel}
                  setShowDeskPanel={setShowDeskPanel}
                  onDeskPanelOpen={() => setOpenRateLimit(false)}
                />
                <GamePlayer
                  key={selectedDesk?.id}
                  game={currentGame!}
                  desk={currentDesk!}
                  cameras={cameras
                    .filter((c) => c.desk_id === selectedDesk.id)
                    .map((c) => c.url)
                    .filter(Boolean)}
                  onBack={() => startTransition(() => setSelectedDesk(null))}
                  openRateLimit={openRateLimit}
                  setOpenRateLimit={setOpenRateLimit}
                />
              </>
            );
          })()
        ) : (
          <>
            <div className="bg-gradient-to-r from-[#3b2a1f] to-[#2c1f16] flex px-4 text-white shrink-0">
              <div className="flex items-center w-full gap-1 mb-4 mt-2">
                <Icon icon="el:speaker" width="35" className="text-[#d29b24]" />
                <div
                  className="cursor-pointer flex-1 bg-gray-900 rounded-tl-lg rounded-l-lg ms-2 px-4 overflow-hidden flex items-center h-[50px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopupOpen(true);
                  }}
                >
                  <span
                    className="text-3xl whitespace-nowrap text-ellipsis block animate-marquee py-1 text-white"
                    style={{ animationDuration: `${duration}s` }}
                  >
                    <span>{currentAnnounce?.content}</span>
                  </span>
                  {popupOpen && currentAnnounce && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                      <div className="bg-[#2b1d11] w-3/4 h-3/5 max-w-[95%] rounded-lg border border-[#3e2e1e] shadow-2xl p-8 relative animate-fadeIn overflow-hidden">
                        <button
                          className="absolute top-4 right-4 w-10 h-10 cursor-pointer flex items-center justify-center rounded-full border-2 border-[#8c7654] text-[#8c7654] opacity-70 hover:opacity-100 hover:scale-110 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPopupOpen(false);
                          }}
                        >
                          <span className="text-3xl font-light leading-none">
                            ✕
                          </span>
                        </button>
                        <h2 className="text-4xl font-bold mb-8 text-white text-center tracking-widest">
                          {currentAnnounce.title}
                        </h2>
                        <div className="text-white text-3xl leading-relaxed text-justify overflow-y-auto overflow-x-hidden h-full px-2 break-words whitespace-pre-wrap">
                          {currentAnnounce.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-2 flex items-center gap-1">
                  <button
                    onClick={() => setOpenReport(true)}
                    className="text-[#d29b24] transform transition-transform duration-200 hover:scale-150"
                  >
                    <Icon
                      icon="uim:calender"
                      width="45"
                      className="cursor-pointer"
                    />
                  </button>
                  <button
                    onClick={() => setOpenHelp(true)}
                    className="text-[#d29b24] transform transition-transform duration-200 hover:scale-150"
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
                    className="text-[#d29b24] transform transition-transform duration-200 hover:scale-150"
                  >
                    <Icon
                      icon="solar:settings-bold"
                      width="45"
                      className="cursor-pointer"
                    />
                  </button>
                  <button
                    onClick={() => setOpenAgreement(true)}
                    className="text-[#d29b24] transform transition-transform duration-200 hover:scale-150"
                  >
                    <Icon
                      icon="mdi:notebook-edit"
                      width="45"
                      className="cursor-pointer"
                    />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-[#d29b24] transform transition-transform duration-200 hover:scale-150"
                  >
                    <Icon
                      icon="material-symbols:exit-to-app-rounded"
                      width="45"
                      className="cursor-pointer"
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="bg-[#2c1f16] flex flex-col gap-3 w-[200px] shrink-0">
                <div className="flex items-center justify-center">
                  <img
                    src="/images/logo.png"
                    alt="card-grid"
                    className="w-35 object-contain"
                  />
                </div>

                <div className="flex flex-col items-center gap-1 overflow-hidden w-full">
                  <div className="flex items-center text-sm text-yellow-200 bg-gray-900 rounded-xl w-full py-1 px-3 gap-2 overflow-hidden">
                    <Icon
                      icon="ph:user-circle-fill"
                      width="30"
                      className="shrink-0"
                    />
                    <span className="text-2xl truncate min-w-0">
                      {user?.account}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-yellow-200 bg-gray-900 rounded-xl w-full py-1 px-3 gap-2 overflow-hidden">
                    <Icon
                      icon="pepicons-pop:yen-circle-filled"
                      width="26"
                      className="shrink-0"
                    />
                    <span className="text-2xl truncate min-w-0">
                      {user?.balance}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end me-3 gap-1 text-lg text-yellow-200">
                  <Icon
                    icon="lineicons:refresh-dollar-1"
                    width="45"
                    height="45"
                    style={{
                      strokeWidth: 5.5,
                    }}
                    className="cursor-pointer transition-transform duration-300 hover:rotate-12"
                    onClick={async () => {
                      try {
                        setbalanceLoading(true);
                        await fetchPlayer(playerID);
                      } catch (error) {
                        console.error("Error:", error);
                      } finally {
                        setTimeout(() => {
                          setbalanceLoading(false);
                        }, 1000);
                      }
                    }}
                  />
                  {balanceLoading && (
                    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                      <div className="text-white text-7xl font-bold tracking-widest animate-pulse">
                        更新余额中.....
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    startTransition(() => {
                      setSelectedGame(0);
                      setIsMultipleBet(false);
                    });
                  }}
                  variant={selectedGame === null ? "default" : "secondary"}
                  className={`casino-gold-btn text-3xl p-9 mx-1 rounded-none rounded-tl-2xl ${
                    !isMultipleBet && selectedGame === 0
                      ? "casino-gold-active"
                      : ""
                  }`}
                >
                  全部
                </Button>

                {games.map((g) => (
                  <Button
                    key={g.id}
                    onClick={() => {
                      startTransition(() => {
                        setSelectedGame(g.id);
                        setIsMultipleBet(false);
                      });
                    }}
                    variant={selectedGame === g.id ? "default" : "secondary"}
                    className={`casino-gold-btn relative text-3xl p-9 mx-1 rounded-none rounded-tl-2xl ${
                      !isMultipleBet && selectedGame === g.id
                        ? "casino-gold-active"
                        : ""
                    }`}
                  >
                    {(g.name === "百家乐" || g.name === "龙虎斗") && (
                      <span className="absolute -top-2 -right-1 bg-[#4d1909] rounded-full px-3.5 py-1 drop-shadow-lg border border-[#f3c960]/30">
                        <Icon
                          icon="mdi:thumb-up"
                          className="text-[#f3c960] w-12 h-12"
                        />
                      </span>
                    )}
                    {g.name}
                  </Button>
                ))}

                <Button
                  onClick={() => setIsMultipleBet(true)}
                  variant="secondary"
                  className={`casino-gold-btn text-3xl p-9 mx-1 rounded-none rounded-tl-2xl ${
                    isMultipleBet ? "casino-gold-active" : ""
                  }`}
                >
                  多台下注
                </Button>

                <TimeDisplay />
                <Button
                  variant="secondary"
                  onClick={() => {
                    const url = import.meta.env.VITE_CUSTOMER_SERVICE_URL;
                    if (url) window.open(url, "_blank");
                  }}
                  className={cn(
                    "casino-gold-btn text-3xl rounded-none p-9 m-1 border-none",
                    "mt-auto flex items-center justify-center gap-1",
                  )}
                >
                  <Icon icon="mdi:customer-service" className="!w-12 !h-12" />
                  在线客服
                </Button>
              </div>

              <div className="flex-1 bg-[#1e1611] overflow-x-auto overflow-y-hidden">
                {isMultipleBet ? (
                  <MultipleBet
                    desks={desks}
                    games={games}
                    cameras={cameras}
                    onExpandDesk={(desk) => {
                      setSelectedDesk(desk);
                      setIsMultipleBet(false);
                    }}
                  />
                ) : (
                  <ScrollArea className="h-full scrollbar-hide">
                    <div className="px-5 py-2 grid grid-cols-2 gap-x-4 gap-y-4">
                      {filteredDesks.map((desk) => (
                        <Card
                          key={desk.id}
                          onClick={() => handleSelectDesk(desk)}
                          className={cn(
                            "bg-[#4a362a] rounded-sm border border-gray-600 text-white py-0 gap-0 cursor-pointer overflow-hidden",
                            "transition-all duration-300 ease-out group",
                            "hover:scale-[1.02] hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(210,155,36,0.2)]",
                          )}
                        >
                          <DeskCardTables desk={desk} compact={true} />
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* CCTV Streaming */}
              {!isMultipleBet && (
                <div className="w-[360px] bg-[#2c1f16] p-4 border-l border-white/5 shrink-0 overflow-hidden">
                  <div className="flex flex-col gap-4">
                    <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-lg">
                      {homeCameraUrls.length > 0 ? (
                        <VideoIframe src={homeCameraUrls[cameraIndex]} />
                      ) : (
                        <div className="flex items-center justify-center h-[200px] text-gray-400">
                          No Camera
                        </div>
                      )}

                      {homeCameraUrls.length > 1 && (
                        <button
                          onClick={handleSwapCamera}
                          className="absolute bottom-0 left-0 text-yellow-400 px-3 py-1 bg-primary rounded-tr-lg cursor-pointer"
                        >
                          <Icon icon="tdesign:swap" width="24" height="24" />
                        </button>
                      )}
                    </div>
                    <div className="rounded-lg overflow-hidden border border-white/10 shadow-lg">
                      <img
                        src="/images/goose.png"
                        alt="golden goose"
                        className="w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        <ReportDialog open={openReport} onClose={() => setOpenReport(false)} />
        <HelpDialog open={openHelp} onClose={() => setOpenHelp(false)} />
        <SettingsDialog
          open={openSettings}
          onClose={() => setOpenSettings(false)}
        />
        <AgreementDialog
          open={openAgreement}
          onClose={() => setOpenAgreement(false)}
        />
      </div>
    </div>
  );
};

export default Home;
