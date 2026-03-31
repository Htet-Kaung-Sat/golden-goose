import {
  createResult,
  finishGameSession,
  getGameInfos,
  updateGameRound,
} from "@/api/operator";
import { ChangeDialog } from "@/components/shared/ChangeDialog";
import { ConfirmResultDialog } from "@/components/shared/ConfirmResultDialog";
import FullscreenToggleButton from "@/components/shared/FullscreenToggleButton";
import { SettingMenu } from "@/components/shared/SettingMenu";
import { Button } from "@/components/ui/button";
import { TypographyH1 } from "@/components/ui/typographyH1";
import { useLoading } from "@/contexts/useLoading";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { Desk } from "@/types";
import { GameRound } from "@/types/GameRound";
import { Result } from "@/types/Result";
import { formatResultDisplay } from "@/utils/FormatResultDisplay";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const showResults = [
  { key: "banker|bankerPair", name: "庄|(庄对)" },
  { key: "player|bankerPair", name: "闲|(庄对)" },
  { key: "tie|bankerPair", name: "和|(庄对)" },
  { key: "banker|playerPair", name: "庄|(闲对)" },
  { key: "player|playerPair", name: "闲|(闲对)" },
  { key: "tie|playerPair", name: "和|(闲对)" },
  { key: "banker|bankerPair|playerPair", name: "庄|(庄/闲对)" },
  { key: "player|bankerPair|playerPair", name: "闲|(庄/闲对)" },
  { key: "tie|bankerPair|playerPair", name: "和|(庄/闲对)" },
  { key: "banker", name: "庄" },
  { key: "player", name: "闲" },
  { key: "tie", name: "和" },
];

const Index = () => {
  const navigate = useNavigate();
  const desk_id = sessionStorage.getItem("desk_id");
  const socket = getSocket();
  const isDealingRef = useRef(false);
  const [timer, setTimer] = useState(0);
  const [progressTimer, setProgressTimer] = useState(0);
  const [time, setTime] = useState(new Date());
  const dateStr = time.toISOString().split("T")[0];
  const timeStr = time.toLocaleTimeString("en-GB");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [desk, setDesk] = useState<Desk>();
  const [lastRound, setLastRound] = useState<GameRound>();
  const [gameResults, setGameResults] = useState<Result[]>([]);
  const [sessionCount, setSessionCount] = useState<number>();
  const { setIsLoading } = useLoading();
  const [status, setStatus] = useState<
    "active" | "betting" | "dealing" | "finished"
  >("active");

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (!desk_id) navigate("/operator/login");
  }, []);

  useEffect(() => {
    fetchGameInfos();
  }, []);

  const fetchGameInfos = async () => {
    if (!desk_id) return;
    try {
      setIsLoading(true);
      const result = await getGameInfos(Number(desk_id));
      setDesk(result.data.desk);
      setSessionCount(result.data.sessionCount);
      setLastRound(result.data.lastRound);
      const roundStatus = result.data.lastRound.status as
        | "active"
        | "betting"
        | "dealing"
        | "finished";
      if (roundStatus === "betting") {
        setStatus("dealing");
        socket.emit(`desk:${result.data.desk.id}:status`, "dealing");
        await updateGameRound(result.data.lastRound.id, { status: "dealing" });
      } else {
        setStatus(roundStatus);
      }
      setGameResults(result.data.results);
    } catch (error) {
      console.error("Error fetching desk", error);
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateGameRoundStatus = async (status: string) => {
    if (!lastRound) return;
    try {
      await updateGameRound(lastRound.id, { status });
    } catch (err) {
      console.error("Failed to update game round:", err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleResultClick = (result: Result) => {
    setSelectedResult(result);
    setConfirmDialogOpen(true);
  };

  const confirmResult = async () => {
    if (!lastRound || !selectedResult || !desk || !desk.game) return;

    setConfirmDialogOpen(false);

    /* ------------ CREATE RESULT ------------ */
    try {
      if (!lastRound || !desk || !desk.game) return;
      setIsLoading(true);

      const data = await createResult({
        round_id: lastRound?.id,
        result: selectedResult.key,
        game_id: desk.game?.id,
        baccarat_type: desk.baccarat_type,
      });

      if (data.success) {
        socket.emit(`desk:${desk?.id}:status`, "finished");
        socket.emit(`desk:${desk?.id}:result`, {
          round_id: data.data.finishedRound.id,
          result: selectedResult.key,
          userNetAmounts: data.data.userNetAmounts ?? [],
        });

        await fetchGameInfos();

        setStatus("finished");
        setProgressTimer(5);

        const interval = setInterval(() => {
          setProgressTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setStatus("active");
              isDealingRef.current = false;
              socket.emit(`desk:${desk?.id}:status`, "active");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      console.error("Create result error:", err);
      toast.error("派彩结果保存失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmChange = async (payload: {
    moper: string;
    hander: string;
    monitor: string;
    cutter: string;
    shuffle_type: string;
    card_color: string;
  }) => {
    if (!desk?.id) return;

    setChangeDialogOpen(false);

    try {
      setIsLoading(true);

      const res = await finishGameSession(desk.id, payload);

      if (res.success) {
        socket.emit(`desk:${desk.id}:finish-session`);

        socket.emit(`desk:${desk.id}:status`, "active");

        await fetchGameInfos();
      } else {
        toast.error(res.message || "换靴失败");
      }
    } catch (err) {
      console.error("Finish session error:", err);
      toast.error("换靴失败");
    } finally {
      setIsLoading(false);
    }
  };

  const startBetting = () => {
    if (timer > 0) {
      stopBetting();
      return;
    }

    setStatus("betting");
    updateGameRoundStatus("betting");
    socket.emit(`desk:${desk?.id}:status`, "betting");
    setTimer(30);
    socket.emit(`desk:${desk?.id}:startTimer`, 30);

    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        const t = prev - 1;
        socket.emit(`desk:${desk?.id}:startTimer`, t <= 0 ? 0 : t);

        if (t <= 0) {
          stopBetting();
          return 0;
        }
        return t;
      });
    }, 1000);
  };

  const stopBetting = () => {
    if (isDealingRef.current) return;
    isDealingRef.current = true;

    if (intervalRef.current) clearInterval(intervalRef.current);

    setStatus("dealing");
    updateGameRoundStatus("dealing");
    socket.emit(`desk:${desk?.id}:status`, "dealing");
    setTimer(0);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <header className="w-full bg-black text-white flex justify-between items-center px-6 py-3 text-3xl font-bold">
        <div className="flex gap-4 items-center">
          <span>台号</span>
          <span className="text-blue-300">
            {desk?.desk_no} {desk?.name} 百家Status:{" "}
            {status === "active"
              ? 4
              : status === "betting"
                ? 0
                : status === "dealing"
                  ? 1
                  : status === "finished"
                    ? 4
                    : "-"}
          </span>
        </div>
        <div className="flex gap-10 items-center">
          <div className="flex gap-5">
            <span>操作员</span>
            <span className="text-blue-300">{desk?.name}</span>
          </div>
          <div className="flex gap-5">
            <span>靴号</span>
            <span className="text-blue-300">{sessionCount}</span>
          </div>
          <div className="flex gap-5">
            <span>局数</span>
            <span className="text-blue-300">{lastRound?.round_no}</span>
          </div>
          <div className="flex gap-5">
            <FullscreenToggleButton />
          </div>
          <div className="flex gap-5">
            <SettingMenu />
          </div>
        </div>
      </header>

      <div className="w-full h-full grid grid-cols-4">
        <div className="col-span-3">
          <div className="bg-yellow-100 text-black flex justify-between items-center p-4">
            <div className="text-8xl font-bold bg-blue-600 text-amber-300 px-10 rounded-lg">
              {desk?.name}
            </div>
            <div className="text-8xl font-bold text-gray-700">
              {dateStr} <span className="text-7xl">{timeStr}</span>
            </div>
          </div>

          <div className="relative bg-cover bg-center h-224 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center blur-sm"
              style={{ backgroundImage: "url('/images/casino_bg.jpg')" }}
            />

            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <img
                src="/images/logo.png"
                alt="Logo"
                className="w-50 rounded-full mb-4"
              />
              <TypographyH1 className="text-yellow-200 text-4xl font-bold">
                新金宝
              </TypographyH1>
            </div>
          </div>
        </div>

        <div className="bg-yellow-100 w-full h-full p-5">
          <div className="flex">
            <div className="overflow-x-auto bg-white">
              <div className="grid grid-rows-6 grid-cols-[repeat(15,40px)]">
                {Array.from({ length: 6 }).map((_, rowIndex) =>
                  Array.from({ length: 15 }).map((_, colIndex) => {
                    const index = colIndex * 6 + rowIndex;
                    const result = gameResults[index];

                    if (!result) {
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className="border border-gray-300 w-[40px] h-[40px]"
                        />
                      );
                    }

                    const {
                      displayName,
                      isBankerPair,
                      isPlayerPair,
                      operatorClass,
                    } = formatResultDisplay(result);

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="border border-gray-300 w-[40px] h-[40px] flex justify-center items-center"
                      >
                        <div
                          className={cn(
                            "relative flex justify-center items-center w-[36px] h-[36px] border-2 rounded-full text-2xl font-bold",
                            operatorClass,
                          )}
                        >
                          {isBankerPair && (
                            <div
                              className="absolute w-2 h-2 bg-red-600 rounded-full"
                              style={{ top: "1px", left: "1px" }}
                            />
                          )}

                          {isPlayerPair && (
                            <div
                              className="absolute w-2 h-2 bg-blue-600 rounded-full"
                              style={{ bottom: "1px", right: "1px" }}
                            />
                          )}

                          <span>{displayName}</span>
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 w-full py-10">
            {showResults.map((result, i) => {
              const firstKey = result.key.split("|")[0];

              return (
                <Button
                  key={i}
                  onClick={() => handleResultClick(result)}
                  disabled={status !== "dealing"}
                  className={cn(
                    "h-30 flex flex-col items-center justify-center text-lg text-white",
                    "font-bold shadow-md cursor-pointer transition-colors duration-200",
                    firstKey === "banker" && "bg-red-600 hover:bg-red-500",
                    firstKey === "player" && "bg-blue-600 hover:bg-blue-500",
                    firstKey === "tie" && "bg-green-600 hover:bg-green-500",
                  )}
                >
                  {result.name.includes("|") ? (
                    <>
                      <span className="text-3xl">
                        {result.name.split("|")[0]}
                      </span>

                      <span className="text-3xl">
                        {result.name.split("|")[1]}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl">{result.name}</span>
                  )}
                </Button>
              );
            })}
          </div>

          <div className="flex gap-1 px-2">
            <Button
              onClick={startBetting}
              disabled={status === "dealing" || status === "finished"}
              className="flex-[1] text-3xl py-10"
            >
              {status === "betting" && `停止下注 (${timer})`}
              {status === "dealing" && "停止下注"}
              {status === "active" && "开始下注"}
              {status === "finished" && `牌局结算中 (${progressTimer})`}
            </Button>

            <Button
              onClick={() => setChangeDialogOpen(true)}
              disabled={!(status === "active" || status === "finished")}
              className="flex-[0.5] text-3xl py-10"
            >
              换靴
            </Button>
          </div>
        </div>
      </div>

      {selectedResult && (
        <ConfirmResultDialog
          open={confirmDialogOpen}
          onConfirm={confirmResult}
          onCancel={() => setConfirmDialogOpen(false)}
          result={selectedResult}
        />
      )}

      <ChangeDialog
        open={changeDialogOpen}
        onConfirm={confirmChange}
        onCancel={() => setChangeDialogOpen(false)}
      />
    </div>
  );
};

export default Index;
