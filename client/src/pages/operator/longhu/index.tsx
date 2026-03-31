import {
  confirmAccount,
  createResult,
  finishGameSession,
  getGameInfos,
  updateGameRound,
} from "@/api/operator";
import { formatResultDisplay } from "@/utils/FormatResultDisplay";
import CardInputPanel from "@/components/shared/CardInputPanel";
import { EditDialog } from "@/components/shared/EditDialog";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/useLoading";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { Desk } from "@/types";
import { GameRound } from "@/types/GameRound";
import { Result } from "@/types/Result";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SettingMenu } from "@/components/shared/SettingMenu";
import { ChangeDialog } from "@/components/shared/ChangeDialog";
import { AxiosError } from "axios";
import FullscreenToggleButton from "@/components/shared/FullscreenToggleButton";

type ScannerPayload = {
  cardCode: string;
  position: number;
};

const Index = () => {
  const navigate = useNavigate();
  const desk_id = sessionStorage.getItem("desk_id");
  const socket = getSocket();
  const isDealingRef = useRef(false);
  const isFinishedRef = useRef(false);
  const [timer, setTimer] = useState(0);
  const [addTime, setAddTime] = useState("");
  const [status, setStatus] = useState<
    "active" | "betting" | "dealing" | "finished"
  >("active");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { setIsLoading } = useLoading();

  const [desk, setDesk] = useState<Desk>();
  const [lastRound, setLastRound] = useState<GameRound>();
  const [gameResults, setGameResults] = useState<Result[]>([]);
  const [sessionCount, setSessionCount] = useState<number>();
  const [progressTimer, setProgressTimer] = useState(0);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);

  /* ---------------- CARD DISPLAY STATES ---------------- */
  const [dragonCard, setDragonCard] = useState<string | null>(null);
  const [tigerCard, setTigerCard] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isManualCardInput, setIsManualCardInput] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const [roundResult, setRoundResult] = useState<Result | null>(null);
  const [finishing, setFinishing] = useState(false);

  /* ------------- CURRENT TIME ------------- */
  const [time, setTime] = useState(new Date());
  const dateStr = time.toISOString().split("T")[0];
  const timeStr = time.toLocaleTimeString("en-GB");

  const SUIT_VALUE: Record<string, number> = {
    S: 4,
    H: 3,
    C: 2,
    D: 1,
  };

  const getCardSuitValue = (card: string) => {
    const suit = card[0];
    return SUIT_VALUE[suit] || 0;
  };

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
    } catch {
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
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSelectCard = (
    rankLabel?: string,
    scannerCard?: ScannerPayload,
  ) => {
    if (
      !desk ||
      isFinishedRef.current ||
      isFinished ||
      (!selectedSuit && !scannerCard)
    )
      return;

    let card: string;

    if (scannerCard) {
      card = scannerCard.cardCode;
    } else {
      if (!selectedSuit || !rankLabel) return;
      const rankMap: Record<string, string> = { A: "1" };
      const rank = rankMap[rankLabel] ?? rankLabel;
      card = `${selectedSuit}${rank}`;
    }

    if (scannerCard) {
      const pos = scannerCard.position;
      if (pos === 1 && !dragonCard) {
        setDragonCard(card);
        sendCardToUsers(card, null);
        return;
      }

      if (pos === 2 && dragonCard && !tigerCard) {
        setTigerCard(card);
        sendCardToUsers(dragonCard, card);

        if (isManualCardInput) {
          setIsFinished(true);
        } else {
          finishRound(dragonCard, card);
        }
        return;
      }
    } else {
      if (!dragonCard) {
        setDragonCard(card);
        sendCardToUsers(card, null);
      } else if (!tigerCard) {
        setTigerCard(card);
        sendCardToUsers(dragonCard, card);
        setIsFinished(true);
      }
    }
  };

  const confirmEdit = async (payload: {
    account: string;
    password: string;
  }) => {
    try {
      setIsLoading(true);

      await confirmAccount({
        ...payload,
        desk_id: Number(desk_id!),
      });

      setEditDialogOpen(false);
      setIsManualCardInput(true);
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || "Confirm account failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLastCard = () => {
    if (status !== "dealing") return;

    setIsFinished(false);
    isFinishedRef.current = false;

    if (tigerCard) {
      setTigerCard(null);
      socket.emit(`desk:${desk?.id}:dealCard`, {
        dragon: dragonCard ? dragonCard : null,
        tiger: null,
      });
      return;
    }

    if (dragonCard) {
      setDragonCard(null);
      socket.emit(`desk:${desk?.id}:dealCard`, {
        dragon: null,
        tiger: null,
      });
      return;
    }
  };

  const handleFinish = async () => {
    if (!dragonCard || !tigerCard) {
      toast.error("Missing cards!");
      return;
    }
    setFinishing(true);
    try {
      await finishRound(dragonCard, tigerCard);
    } finally {
      setFinishing(false);
    }
  };

  useEffect(() => {
    if (!desk || status !== "dealing") return;

    const eventName = `desk:${desk.desk_no}:rawScan`;

    const handleRawScan = (payload: ScannerPayload) => {
      handleSelectCard(undefined, payload);
    };

    socket.on(eventName, handleRawScan);

    return () => {
      socket.off(eventName, handleRawScan);
    };
  }, [desk, status, dragonCard, isManualCardInput]);

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
        setDragonCard(null);
        setTigerCard(null);
        setRoundResult(null);

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

  /* ------------------------- START BETTING -------------------------- */
  const startBetting = () => {
    if (timer > 0) {
      stopBetting();
      return;
    }

    setStatus("betting");
    updateGameRoundStatus("betting");
    socket.emit(`desk:${desk?.id}:status`, "betting");

    setDragonCard(null);
    setTigerCard(null);
    setRoundResult(null);
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
    if (isDealingRef.current || !desk) return;
    isDealingRef.current = true;

    if (intervalRef.current) clearInterval(intervalRef.current);

    setStatus("dealing");
    updateGameRoundStatus("dealing");
    socket.emit(`desk:${desk?.id}:status`, "dealing");
    setTimer(0);
  };

  const getRank = (card: string) => card.slice(1);

  const rankValue = (rank: string) => {
    if (rank === "A") return 1;
    if (rank === "J") return 11;
    if (rank === "Q") return 12;
    if (rank === "K") return 13;
    return Number(rank);
  };

  const sendCardToUsers = (
    currentDragon: string | null,
    currentTiger: string | null,
  ) => {
    socket.emit(`desk:${desk?.id}:dealCard`, {
      dragon: currentDragon ? currentDragon : null,
      tiger: currentTiger ? currentTiger : null,
    });
  };

  /* -------------------------- CALCULATE RESULT -------------------------- */

  const finishRound = async (dragon: string, tiger: string) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    if (!lastRound || !desk) return;

    const dRank = rankValue(getRank(dragon));
    const tRank = rankValue(getRank(tiger));

    const dSuit = getCardSuitValue(dragon);
    const tSuit = getCardSuitValue(tiger);

    const resultParts: string[] = [];

    if (dRank > tRank) {
      resultParts.push("dragon");
    } else if (tRank > dRank) {
      resultParts.push("tiger");
    } else {
      if (dragon === tiger) {
        resultParts.push("tie");
      } else {
        if (dSuit > tSuit) {
          resultParts.push("dragon");
        } else {
          resultParts.push("tiger");
        }
      }
    }

    resultParts.push(dRank % 2 === 1 ? "dragonSingle" : "dragonDouble");

    resultParts.push(tRank % 2 === 1 ? "tigerSingle" : "tigerDouble");

    const resultString = resultParts.join("|");

    let mainResult = "tie";
    if (resultParts.includes("dragon")) mainResult = "dragon";
    if (resultParts.includes("tiger")) mainResult = "tiger";

    // sendCardToUsers(dragon, tiger);

    /* ------------ CREATE RESULT ------------ */
    try {
      setIsLoading(true);
      const data = await createResult({
        round_id: lastRound.id,
        game_id: desk.game_id,
        baccarat_type: null,
        result: resultString,
        cards: {
          dragon,
          tiger,
        },
      });

      if (data.success) {
        socket.emit(`desk:${desk?.id}:status`, "finished");
        socket.emit(`desk:${desk?.id}:result`, {
          round_id: data.data.finishedRound.id,
          result: resultString,
          userNetAmounts: data.data.userNetAmounts ?? [],
        });

        await fetchGameInfos();

        setRoundResult({ key: mainResult });
        setStatus("finished");
        setIsFinished(false);
        setIsManualCardInput(false);
        setSelectedSuit(null);
        setProgressTimer(5);

        const interval = setInterval(() => {
          setProgressTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setStatus("active");
              isDealingRef.current = false;
              isFinishedRef.current = false;

              setDragonCard(null);
              setTigerCard(null);
              setRoundResult(null);

              socket.emit(`desk:${desk.id}:status`, "active");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      toast.error("派彩结果保存失败，请重试");
      isFinishedRef.current = false;
    } finally {
      setIsLoading(false);
    }
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

      <div className="grid grid-cols-4">
        {/* LEFT SIDE */}
        <div className="col-span-3">
          <div className="bg-[#0b3d0b] text-black flex justify-between items-center p-4 border-b-1 border-b-gray-400">
            <div className="text-8xl font-bold bg-blue-600 text-amber-300 px-6 py-2 rounded-lg">
              {desk?.name}
            </div>
            <div className="text-8xl font-bold text-amber-100">
              {dateStr} <span className="text-7xl">{timeStr}</span>
            </div>
          </div>

          <div className="relative bg-[#0b3d0b] h-[900px] flex flex-col justify-start pt-16">
            <div className="relative flex items-center justify-between px-32">
              <div className="flex gap-6 items-center">
                <div className="w-32 h-32 border-[8px] border-red-600 text-red-600 rounded-full flex justify-center items-center text-[80px] font-bold">
                  龙
                </div>

                <div className="flex gap-6">
                  {dragonCard ? (
                    <img
                      key={`dragon-${dragonCard}`}
                      src={`/images/cards/${dragonCard}.jpg`}
                      className="w-40 h-56 rounded-lg border border-black animate-flipCard"
                    />
                  ) : (
                    <img
                      key="dragon-back"
                      src={`/images/cards/back.jpg`}
                      className="w-40 h-56 rounded-lg border border-black animate-flipCard"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-6 items-center">
                <div className="flex gap-6">
                  {tigerCard ? (
                    <img
                      key={`tiger-${tigerCard}`}
                      src={`/images/cards/${tigerCard}.jpg`}
                      className="w-40 h-56 rounded-lg border border-black animate-flipCard"
                    />
                  ) : (
                    <img
                      key="tiger-back"
                      src={`/images/cards/back.jpg`}
                      className="w-40 h-56 rounded-lg border border-black animate-flipCard"
                    />
                  )}
                </div>

                <div className="w-32 h-32 border-[8px] border-blue-600 text-blue-600 rounded-full flex justify-center items-center text-[80px] font-bold">
                  虎
                </div>
              </div>

              {status === "finished" && roundResult && (
                <div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 flex justify-center",
                    "items-center w-72 h-72 border-[12px] rounded-full text-[140px] font-bold",
                    formatResultDisplay(roundResult).operatorClass,
                  )}
                >
                  <span>{formatResultDisplay(roundResult).displayName}</span>
                </div>
              )}
            </div>
            {isManualCardInput ? (
              <div className="flex items-center justify-end w-full gap-6 mt-20 mr-20">
                <CardInputPanel
                  selectedSuit={selectedSuit}
                  status={status}
                  onSuit={setSelectedSuit}
                  onRank={handleSelectCard}
                  onDelete={handleDeleteLastCard}
                  canFinish={isFinished}
                  onFinish={handleFinish}
                  finishing={finishing}
                />
              </div>
            ) : status === "dealing" ? (
              <div className="flex items-center justify-end w-full gap-6 mt-20 mr-20">
                <Button
                  variant="info"
                  className="text-3xl py-6"
                  onClick={handleDeleteLastCard}
                >
                  清除一张
                </Button>

                <Button
                  variant="info"
                  onClick={() => setEditDialogOpen(true)}
                  className="text-3xl py-6 me-10"
                >
                  修改
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-yellow-100 p-1">
          <div className="flex py-3">
            <div className="overflow-x-auto bg-white">
              <div className="grid grid-rows-6 grid-cols-[repeat(15,42px)]">
                {Array.from({ length: 6 }).map((_, rowIndex) =>
                  Array.from({ length: 15 }).map((_, colIndex) => {
                    const index = colIndex * 6 + rowIndex;
                    const result = gameResults[index];

                    if (!result) {
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className="border border-gray-300 w-[42px] h-[42px]"
                        />
                      );
                    }

                    const { displayName, operatorClass } =
                      formatResultDisplay(result);

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="border border-gray-300 w-[42px] h-[42px] flex justify-center items-center"
                      >
                        <div
                          className={cn(
                            "relative flex justify-center items-center w-[38px] h-[38px] border-2 rounded-full text-2xl font-bold",
                            operatorClass,
                          )}
                        >
                          <span>{displayName}</span>
                        </div>
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          </div>
          <div className="w-full">
            <div className="w-full flex flex-col items-center py-10">
              <div className="text-[320px] leading-none font-bold text-black">
                {timer}
              </div>

              {/* Input to add time (Enter to apply) */}
              <input
                type="number"
                placeholder="点此回车"
                value={addTime}
                onChange={(e) => setAddTime(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addTime) {
                    const added = Number(addTime);
                    setTimer((prev) => {
                      const next = prev + added;
                      socket.emit(`desk:${desk?.id}:startTimer`, next);
                      return next;
                    });
                    setAddTime("");
                  }
                }}
                disabled={status !== "betting"}
                className="mt-2 w-40 text-3xl px-3 py-1 border-2 border-gray-700 rounded bg-white"
              />
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <Button
                onClick={startBetting}
                disabled={status === "dealing" || status === "finished"}
                className="bg-black text-white text-3xl py-10"
              >
                {status === "betting" && `停止下注 (${timer})`}
                {status === "dealing" && "停止下注"}
                {status === "active" && "开始下注"}
                {status === "finished" && `牌局结算中 (${progressTimer})`}
              </Button>

              <Button
                onClick={() => setChangeDialogOpen(true)}
                disabled={!(status === "active" || status === "finished")}
                className="bg-black text-white text-3xl py-10"
              >
                换靴
              </Button>
            </div>
          </div>
        </div>
      </div>
      <EditDialog
        open={editDialogOpen}
        onConfirm={confirmEdit}
        onCancel={() => setEditDialogOpen(false)}
      />

      <ChangeDialog
        open={changeDialogOpen}
        onConfirm={confirmChange}
        onCancel={() => setChangeDialogOpen(false)}
      />
    </div>
  );
};

export default Index;
