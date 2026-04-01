import {
  confirmAccount,
  createResult,
  finishGameSession,
  getGameInfos,
  updateGameRound,
} from "@/api/operator";
import { formatResultDisplay } from "@/utils/FormatResultDisplay";
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
import { EditDialog } from "@/components/shared/EditDialog";
import CardInputPanel from "@/components/shared/CardInputPanel";
import { AxiosError } from "axios";
import FullscreenToggleButton from "@/components/shared/FullscreenToggleButton";

type ScannerPayload = {
  cardCode: string;
  position: 1 | 2 | 3 | 4 | 5 | 6;
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
  const [playerCards, setPlayerCards] = useState<string[]>(["back", "back"]);
  const [bankerCards, setBankerCards] = useState<string[]>(["back", "back"]);

  const [playerDraw, setPlayerDraw] = useState<string | null>(null);
  const [bankerDraw, setBankerDraw] = useState<string | null>(null);

  const [roundResult, setRoundResult] = useState<Result | null>(null);

  /* ------------- CURRENT TIME ------------- */
  const [time, setTime] = useState(new Date());
  const dateStr = time.toISOString().split("T")[0];
  const timeStr = time.toLocaleTimeString("en-GB");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isManualCardInput, setIsManualCardInput] = useState(false);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [manualCards, setManualCards] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [finishing, setFinishing] = useState(false);

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
  }, [desk, status]);

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
        setPlayerCards(["back", "back"]);
        setBankerCards(["back", "back"]);
        setPlayerDraw(null);
        setBankerDraw(null);
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

    // reset cards
    setPlayerCards(["back", "back"]);
    setBankerCards(["back", "back"]);
    setPlayerDraw(null);
    setBankerDraw(null);
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
    if (isDealingRef.current) return;
    isDealingRef.current = true;

    if (intervalRef.current) clearInterval(intervalRef.current);

    setStatus("dealing");
    updateGameRoundStatus("dealing");
    socket.emit(`desk:${desk?.id}:status`, "dealing");
    setTimer(0);
  };

  /* ======================= DEAL + DRAW PROCESS ======================= */
  const handleSelectCard = (
    rankLabel?: string,
    scannerCard?: ScannerPayload,
  ) => {
    if (isFinishedRef.current || isFinished || (!selectedSuit && !scannerCard))
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

    setManualCards((prev) => {
      const next = [...prev];

      if (scannerCard) {
        const posIndex = scannerCard.position - 1;
        if (posIndex === 0) {
          next[0] = card;
        } else if (posIndex === 1 && next[0]) {
          next[1] = card;
        } else if (posIndex === 2 && next[0] && next[1]) {
          next[2] = card;
        } else if (posIndex === 3 && next[0] && next[1] && next[2]) {
          next[3] = card;
        } else if (posIndex === 4 && next[0] && next[1] && next[2] && next[3]) {
          const pTotal =
            (baccaratPoint(getRank(next[0])) +
              baccaratPoint(getRank(next[1]))) %
            10;
          if (shouldPlayerDraw(pTotal)) {
            next[posIndex] = card;
          }
        } else if (posIndex === 5 && next[0] && next[1] && next[2] && next[3]) {
          const pTotal =
            (baccaratPoint(getRank(next[0])) +
              baccaratPoint(getRank(next[1]))) %
            10;
          const bTotal =
            (baccaratPoint(getRank(next[2])) +
              baccaratPoint(getRank(next[3]))) %
            10;
          if (next[4]) {
            const p3Val = baccaratPoint(getRank(next[4]));
            if (shouldBankerDraw(bTotal, p3Val)) {
              next[posIndex] = card;
            }
          } else {
            if (!shouldPlayerDraw(pTotal) && shouldBankerDraw(bTotal, null)) {
              next[posIndex] = card;
            }
          }
        }
      } else {
        const targetIndex = getNextManualIndex(next);

        if (targetIndex === -1) {
          toast.warning("当前无需补牌");
          return prev;
        }

        next[targetIndex] = card;
      }

      setPlayerCards([next[1] ?? "back", next[0] ?? "back"]);

      setBankerCards([next[3] ?? "back", next[2] ?? "back"]);

      setPlayerDraw(next[4] ?? null);
      setBankerDraw(next[5] ?? null);

      socket.emit(`desk:${desk?.id}:dealCard`, {
        cards: {
          player: {
            p1: next[0] ?? null,
            p2: next[1] ?? null,
            p3: next[4] ?? null,
          },
          banker: {
            b1: next[2] ?? null,
            b2: next[3] ?? null,
            b3: next[5] ?? null,
          },
        },
      });

      const pCards = [next[0], next[1]].filter(Boolean) as string[];
      const bCards = [next[2], next[3]].filter(Boolean) as string[];

      const pTotal =
        pCards.reduce((s, c) => s + baccaratPoint(getRank(c)), 0) % 10;
      const bTotal =
        bCards.reduce((s, c) => s + baccaratPoint(getRank(c)), 0) % 10;

      const hasP1 = !!next[0];
      const hasP2 = !!next[1];
      const hasB1 = !!next[2];
      const hasB2 = !!next[3];
      const hasP3 = !!next[4];
      const hasB3 = !!next[5];

      if (hasP1 && hasP2 && hasB1 && hasB2) {
        if (pTotal >= 8 || bTotal >= 8) {
          setIsFinished(true);
          return next;
        }

        /* -------- PLAYER DRAW DECISION -------- */
        const playerShouldDraw = shouldPlayerDraw(pTotal);

        if (!playerShouldDraw) {
          const bankerShouldDraw = shouldBankerDraw(bTotal, null);

          if (!bankerShouldDraw) {
            setIsFinished(true);
            return next;
          }
        }
      }

      /* -------- PLAYER 3RD CARD EXISTS -------- */
      if (hasP3 && !hasB3) {
        const p3Val = baccaratPoint(getRank(next[4]));
        const bankerShouldDraw = shouldBankerDraw(bTotal, p3Val);

        if (!bankerShouldDraw) {
          setIsFinished(true);
          return next;
        }
      }

      if (hasB3) {
        setIsFinished(true);
      }

      return next;
    });
  };

  const getNextManualIndex = (cards: string[]) => {
    const [p1, p2, b1, b2, p3, b3] = cards;

    if (!p1) return 0;
    if (!p2) return 1;
    if (!b1) return 2;
    if (!b2) return 3;

    const pTotal =
      (baccaratPoint(getRank(p1)) + baccaratPoint(getRank(p2))) % 10;

    const bTotal =
      (baccaratPoint(getRank(b1)) + baccaratPoint(getRank(b2))) % 10;

    if (pTotal >= 8 || bTotal >= 8) return -1;

    /* ---------- PLAYER DRAW ---------- */
    if (!p3) {
      if (shouldPlayerDraw(pTotal)) {
        return 4;
      }
      if (shouldBankerDraw(bTotal, null)) {
        return 5;
      }
      return -1;
    }

    /* ---------- BANKER DRAW ---------- */
    if (!b3) {
      const p3Val = baccaratPoint(getRank(p3));
      if (shouldBankerDraw(bTotal, p3Val)) {
        return 5;
      }
      return -1;
    }

    return -1;
  };

  const shouldPlayerDraw = (pTotal: number) => pTotal <= 5;

  const shouldBankerDraw = (bTotal: number, p3: number | null) => {
    if (p3 === null) return bTotal <= 5;

    if (bTotal <= 2) return true;
    if (bTotal === 3 && p3 !== 8) return true;
    if (bTotal === 4 && p3 >= 2 && p3 <= 7) return true;
    if (bTotal === 5 && p3 >= 4 && p3 <= 7) return true;
    if (bTotal === 6 && p3 >= 6 && p3 <= 7) return true;

    return false;
  };

  const handleDeleteLastCard = () => {
    setIsFinished(false);

    setManualCards((prev) => {
      if (!prev.length) return prev;

      const next = [...prev];

      const lastIndex = [...next]
        .map((c, i) => (c ? i : -1))
        .filter((i) => i !== -1)
        .pop();

      if (lastIndex === undefined) return prev;

      let deletedPosition: "p1" | "p2" | "b1" | "b2" | "p3" | "b3";

      switch (lastIndex) {
        case 0:
          deletedPosition = "p1";
          break;
        case 1:
          deletedPosition = "p2";
          break;
        case 2:
          deletedPosition = "b1";
          break;
        case 3:
          deletedPosition = "b2";
          break;
        case 4:
          deletedPosition = "p3";
          break;
        case 5:
          deletedPosition = "b3";
          break;
        default:
          return prev;
      }

      next.splice(lastIndex, 1);

      setPlayerCards(["back", "back"]);
      setBankerCards(["back", "back"]);
      setPlayerDraw(null);
      setBankerDraw(null);

      next.forEach((card, index) => {
        if (!card) return;

        if (index === 0 || index === 1) {
          setPlayerCards((p) => (index === 0 ? ["back", card] : [card, p[1]]));
        } else if (index === 2 || index === 3) {
          setBankerCards((b) => (index === 2 ? ["back", card] : [card, b[1]]));
        } else if (index === 4) {
          setPlayerDraw(card);
        } else if (index === 5) {
          setBankerDraw(card);
        }
      });

      socket.emit(`desk:${desk?.id}:deleteLastCard`, {
        position: deletedPosition,
      });

      return next;
    });
  };

  const baccaratPoint = (rank: string) => {
    if (["10", "J", "Q", "K"].includes(rank)) return 0;
    return Number(rank);
  };
  const getRank = (card: string) => {
    return card.slice(1);
  };

  useEffect(() => {
    if (isFinished && !isManualCardInput) finishBaccaratRound();
  }, [isFinished]);

  /* -------------------------- CALCULATE RESULT -------------------------- */
  const finishBaccaratRound = async () => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setFinishing(true);

    const pCards = manualCards.filter((_, i) => i === 0 || i === 1 || i === 4);
    const bCards = manualCards.filter((_, i) => i === 2 || i === 3 || i === 5);

    const pTotal =
      pCards.reduce((s, c) => s + baccaratPoint(getRank(c)), 0) % 10;
    const bTotal =
      bCards.reduce((s, c) => s + baccaratPoint(getRank(c)), 0) % 10;

    let finalResult = "";
    if (pTotal > bTotal) finalResult = "player";
    else if (bTotal > pTotal) finalResult = "banker";
    else finalResult = "tie";

    /* ------------ PAIRS ------------ */
    const playerPair = getRank(pCards[0]) === getRank(pCards[1]);
    const bankerPair = getRank(bCards[0]) === getRank(bCards[1]);

    /* ------------ ANY PAIR ------------ */
    const anyPair = playerPair || bankerPair;

    /* ------------ PERFECT PAIR (exact same rank + same suit) ------------ */
    const perfectPair = pCards[0] === pCards[1] || bCards[0] === bCards[1];

    /* ------------ BIG / SMALL ------------ */
    // Total cards on table
    const cardCount = pCards.length + bCards.length;

    let bigOrSmall = "";
    if (cardCount === 4) bigOrSmall = "small";
    else if (cardCount === 5 || cardCount === 6) bigOrSmall = "big";

    /* ------------ BUILD RESULT KEYS FOR API ------------ */
    const resultKeys: string[] = [];

    resultKeys.push(finalResult);
    if (playerPair) resultKeys.push("playerPair");
    if (bankerPair) resultKeys.push("bankerPair");
    if (anyPair) resultKeys.push("anyPair");
    if (perfectPair) resultKeys.push("perfectPair");
    if (bigOrSmall) resultKeys.push(bigOrSmall);

    const resultString = resultKeys.join("|");

    /* ------------ CREATE RESULT ------------ */
    try {
      setIsLoading(true);
      if (!lastRound || !desk || !desk.game) return;
      const cardsPayload = {
        player: {
          p1: manualCards[0] ?? null,
          p2: manualCards[1] ?? null,
          p3: manualCards[4] ?? null,
        },
        banker: {
          b1: manualCards[2] ?? null,
          b2: manualCards[3] ?? null,
          b3: manualCards[5] ?? null,
        },
      };

      const data = await createResult({
        round_id: lastRound.id,
        result: resultString,
        game_id: desk.game_id,
        baccarat_type: "G",
        cards: cardsPayload,
      });

      if (data.success) {
        socket.emit(`desk:${desk?.id}:status`, "finished");
        socket.emit(`desk:${desk?.id}:result`, {
          round_id: data.data.finishedRound.id,
          result: resultString,
          userNetAmounts: data.data.userNetAmounts ?? [],
        });

        await fetchGameInfos();

        setRoundResult({ key: resultString });
        setStatus("finished");
        setProgressTimer(5);
        setIsManualCardInput(false);
        setManualCards([]);
        setSelectedSuit(null);
        setIsFinished(false);

        const interval = setInterval(() => {
          setProgressTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setStatus("active");
              isDealingRef.current = false;
              isFinishedRef.current = false;
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
      isFinishedRef.current = false;
    } finally {
      setFinishing(false);
      setIsLoading(false);
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
            <div className="text-8xl font-bold bg-blue-600 text-yellow-300 px-6 py-2 rounded-lg">
              {desk?.name}
            </div>
            <div className="text-8xl font-bold text-amber-100">
              {dateStr} <span className="text-7xl">{timeStr}</span>
            </div>
          </div>

          {/* CARD TABLE */}
          <div className="relative bg-[#0b3d0b] h-[900px] flex flex-col justify-start pt-16">
            <div className="flex items-center justify-center gap-20 mb-10">
              {/* BANKER */}
              <div className="flex gap-6">
                <div className="w-32 h-32 border-[8px] border-red-600 text-red-600 rounded-full flex justify-center items-center text-[80px] font-bold">
                  庄
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex gap-6">
                    {bankerCards.map((c, i) => (
                      <img
                        key={`${i}-${c}`}
                        src={
                          c === "back"
                            ? "/images/cards/back.jpg"
                            : `/images/cards/${c}.jpg`
                        }
                        className="w-40 h-56 rounded-lg border border-black animate-flipCard"
                      />
                    ))}
                  </div>

                  <div className="flex justify-center h-56">
                    {bankerDraw && (
                      <img
                        key={`bankerDraw-${bankerDraw}`}
                        src={`/images/cards/${bankerDraw}.jpg`}
                        className="w-40 h-56 rounded-lg border border-black animate-flipCard"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* PLAYER */}
              <div className="flex gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex gap-6">
                    {playerCards.map((c, i) => (
                      <img
                        key={`${i}-${c}`}
                        src={
                          c === "back"
                            ? "/images/cards/back.jpg"
                            : `/images/cards/${c}.jpg`
                        }
                        className="w-40 h-56 rounded-lg border border-black animate-flipCard"
                      />
                    ))}
                  </div>

                  <div className="flex justify-center h-56">
                    {playerDraw && (
                      <img
                        key={`playerDraw-${playerDraw}`}
                        src={`/images/cards/${playerDraw}.jpg`}
                        className="w-40 h-56 rounded-lg border border-black animate-flipCard"
                      />
                    )}
                  </div>
                </div>

                <div className="w-32 h-32 border-[8px] border-blue-600 text-blue-600 rounded-full flex justify-center items-center text-[80px] font-bold">
                  闲
                </div>
              </div>

              {status === "finished" &&
                roundResult &&
                (() => {
                  const {
                    displayName,
                    isBankerPair,
                    isPlayerPair,
                    operatorClass,
                  } = formatResultDisplay(roundResult);

                  return (
                    <div
                      className={cn(
                        "absolute flex justify-center items-center w-60 h-60 border-[12px] rounded-full text-[160px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                        operatorClass,
                      )}
                    >
                      {isBankerPair && (
                        <div
                          className="absolute w-10 h-10 bg-red-600 rounded-full"
                          style={{ top: "45px", left: "1px" }}
                        />
                      )}

                      {isPlayerPair && (
                        <div
                          className="absolute w-10 h-10 bg-blue-600 rounded-full"
                          style={{ bottom: "45px", right: "1px" }}
                        />
                      )}

                      <span>{displayName}</span>
                    </div>
                  );
                })()}
            </div>

            {isManualCardInput ? (
              <CardInputPanel
                selectedSuit={selectedSuit}
                status={status}
                onSuit={setSelectedSuit}
                onRank={handleSelectCard}
                onDelete={handleDeleteLastCard}
                canFinish={isFinished}
                onFinish={finishBaccaratRound}
                finishing={finishing}
              />
            ) : status === "dealing" ? (
              <div className="flex items-center justify-end w-full gap-2">
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
                  className="text-3xl py-6"
                >
                  修改
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-yellow-100 px-3">
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

                    const {
                      displayName,
                      isBankerPair,
                      isPlayerPair,
                      operatorClass,
                    } = formatResultDisplay(result);

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
          {/* Bottom Section – Updated UI */}
          <div className="w-full">
            {/* Big Timer Display */}
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

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-4">
              {/* Main Betting Button */}
              <Button
                onClick={startBetting}
                disabled={status === "dealing" || status === "finished"}
                className="bg-primary text-white text-3xl py-10"
              >
                {status === "betting" && `停止下注 (${timer})`}
                {status === "dealing" && "停止下注"}
                {status === "active" && "开始下注"}
                {status === "finished" && `牌局结算中 (${progressTimer})`}
              </Button>

              {/* Change Shoe Button */}
              <Button
                onClick={() => setChangeDialogOpen(true)}
                disabled={!(status === "active" || status === "finished")}
                className="bg-primary text-white text-3xl py-10"
              >
                换靴
              </Button>
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
    </div>
  );
};

export default Index;
