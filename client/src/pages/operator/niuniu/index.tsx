import {
  confirmAccount,
  createNiuniuResult,
  createResult,
  finishGameSession,
  getGameInfos,
  invalidGame,
  updateGameRound,
} from "@/api/operator";
import CardInputPanel from "@/components/shared/CardInputPanel";
import { ChangeDialog } from "@/components/shared/ChangeDialog";
import { EditDialog } from "@/components/shared/EditDialog";
import FullscreenToggleButton from "@/components/shared/FullscreenToggleButton";
import { SettingMenu } from "@/components/shared/SettingMenu";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/useLoading";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { Desk } from "@/types";
import { GameRound } from "@/types/GameRound";
import { AxiosError } from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Seat = "banker" | "player1" | "player2" | "player3";
type HandType = "bomb" | "fiveFace" | "niuNiu" | "niu" | "noNiu";

/* ----------------------------- CARD UTILITIES ------------------------------ */
const getDealOrderByRank = (rank: number): Seat[] => {
  if ([1, 5, 9, 13].includes(rank))
    return ["player1", "player2", "player3", "banker"];
  if ([2, 6, 10].includes(rank))
    return ["player2", "player3", "banker", "player1"];
  if ([3, 7, 11].includes(rank))
    return ["player3", "banker", "player1", "player2"];
  return ["banker", "player1", "player2", "player3"];
};

const RANK_VALUE: Record<string, number> = {
  A: 1,
  J: 11,
  Q: 12,
  K: 13,
};

const SUIT_VALUE: Record<string, number> = {
  S: 4,
  H: 3,
  C: 2,
  D: 1,
};

const HAND_TYPE_RANK: Record<HandType, number> = {
  bomb: 6,
  fiveFace: 5,
  niuNiu: 4,
  niu: 3,
  noNiu: 1,
};

const getCardRankValue = (card: string) => {
  const rank = card.slice(1);
  return RANK_VALUE[rank] ?? Number(rank);
};

const getCardSuitValue = (card: string) => {
  const suit = card[0];
  return SUIT_VALUE[suit];
};

const getMaxCard = (cards: string[]) => {
  return cards.reduce((max, card) => {
    const r1 = getCardRankValue(card);
    const r2 = getCardRankValue(max);

    if (r1 > r2) return card;
    if (r1 < r2) return max;

    return getCardSuitValue(card) > getCardSuitValue(max) ? card : max;
  });
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
  const [changeCard, setChangeCard] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { setIsLoading } = useLoading();

  const [desk, setDesk] = useState<Desk>();
  const [lastRound, setLastRound] = useState<GameRound>();
  const [sessionCount, setSessionCount] = useState<number>();
  const [progressTimer, setProgressTimer] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [invalidDialogOpen, setInvalidDialogOpen] = useState(false);
  const [isManualCardInput, setIsManualCardInput] = useState(false);

  /* ---------------- CARD DISPLAY STATES ---------------- */
  const [cards, setCards] = useState<Record<Seat, string[]>>({
    banker: [],
    player1: [],
    player2: [],
    player3: [],
  });
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [firstCard, setFirstCard] = useState<string | null>(null);
  const [dealOrder, setDealOrder] = useState<Seat[]>([]);
  const [dealPointer, setDealPointer] = useState(0);
  const [scannedCard, setScannedCard] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);

  /* ------------- CURRENT TIME ------------- */
  const [time, setTime] = useState(new Date());
  const dateStr = time.toISOString().split("T")[0];
  const timeStr = time.toLocaleTimeString("en-GB");

  const isAllCardsDealt =
    cards.banker.length === 5 &&
    cards.player1.length === 5 &&
    cards.player2.length === 5 &&
    cards.player3.length === 5;

  const isBomb = (hand: string[]) => {
    const count: Record<string, number> = {};
    hand.forEach((c) => {
      const rank = getRank(c);
      count[rank] = (count[rank] || 0) + 1;
    });
    return Object.values(count).includes(4);
  };

  const isFiveFace = (hand: string[]) => {
    return hand.every((c) => ["J", "Q", "K"].includes(getRank(c)));
  };

  const getHandType = (hand: string[]) => {
    if (isBomb(hand)) return "bomb";
    if (isFiveFace(hand)) return "fiveFace";

    const niu = calcNiu(hand);
    if (niu === 10) return "niuNiu";
    if (niu > 0) return "niu";
    return "noNiu";
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
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!desk || status !== "dealing") return;
    const handler = (payload: { cardCode: string }) => {
      const { cardCode } = payload;

      handleSelectCard(undefined, cardCode);
      setChangeCard((prev) => prev + 1);
    };

    socket.on(`desk:${desk.desk_no}:rawScan`, handler);
    return () => {
      socket.off(`desk:${desk.desk_no}:rawScan`, handler);
    };
  }, [desk, status, changeCard, scannedCard, firstCard, cards]);

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

  /* ======================= DEAL PROCESS ======================= */
  const handleSelectCard = (rankLabel?: string, scannerCard?: string) => {
    if (!scannerCard && !selectedSuit) return;

    const rankMap: Record<string, string> = {
      A: "1",
      J: "J",
      Q: "Q",
      K: "K",
    };

    let rankValue;
    let rank;
    let card;
    if (scannerCard) {
      rank = rankMap[scannerCard.slice(1)] ?? scannerCard.slice(1);
      rankValue = RANK_VALUE[scannerCard.slice(1)] ?? scannerCard.slice(1);
      card = scannerCard;
    } else {
      if (!rankLabel) return;
      rank = rankMap[rankLabel] ?? rankLabel;
      rankValue = RANK_VALUE[rankLabel] ?? rankLabel;
      card = `${selectedSuit}${rank}`;
    }

    if (scannedCard.includes(card)) {
      console.warn("Duplicate scan ignored:", card);
      return;
    }

    setScannedCard((prev) => [...prev, card]);

    if (!firstCard) {
      setFirstCard(card);
      setDealOrder(getDealOrderByRank(Number(rankValue)));

      const payload = {
        firstCard: card,
        cards: {
          banker: [],
          player1: [],
          player2: [],
          player3: [],
        },
      };

      socket.emit(`desk:${desk?.id}:dealCard`, payload);
      return;
    }

    if (dealPointer >= 20) return;

    const seat = dealOrder[dealPointer % 4];

    setCards((prev) => ({
      ...prev,
      [seat]: [...prev[seat], card],
    }));

    const nextCards = {
      ...cards,
      [seat]: [...cards[seat], card],
    };

    setDealPointer((p) => p + 1);

    socket.emit(`desk:${desk?.id}:dealCard`, {
      firstCard,
      cards: nextCards,
    });
  };

  const nextDealSeat =
    firstCard && dealPointer < 20 ? dealOrder[dealPointer % 4] : null;

  const nextCardIndex = Math.floor(dealPointer / 4);

  const handleDeleteLastCard = () => {
    if (dealPointer === 0) return;

    const prevPointer = dealPointer - 1;
    const seat = dealOrder[prevPointer % 4];

    setCards((prev) => {
      const newSeatCards = [...prev[seat]];
      newSeatCards.pop();

      return {
        ...prev,
        [seat]: newSeatCards,
      };
    });

    setScannedCard((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });

    setDealPointer(prevPointer);

    socket.emit(`desk:${desk?.id}:deleteLastCard`, { seat });
  };

  const niuPoint = (rank: string) => {
    if (["J", "Q", "K"].includes(rank)) return 10;
    if (rank === "1") return 1;
    return Number(rank);
  };

  const getRank = (card: string) => card.slice(1);

  /* -------------------------- CALCULATE RESULT -------------------------- */
  const calcNiu = (hand: string[]) => {
    const values = hand.map((c) => niuPoint(getRank(c)));

    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 4; j++) {
        for (let k = j + 1; k < 5; k++) {
          const sum3 = values[i] + values[j] + values[k];
          if (sum3 % 10 === 0) {
            const rest = values.reduce((a, b) => a + b, 0) - sum3;
            const niu = rest % 10;
            return niu === 0 ? 10 : niu;
          }
        }
      }
    }
    return 0;
  };

  const compareHands = (
    bankerCards: string[],
    playerCards: string[],
    bankerNiu: number,
    playerNiu: number,
  ) => {
    const bankerType = getHandType(bankerCards);
    const playerType = getHandType(playerCards);

    if (HAND_TYPE_RANK[playerType] !== HAND_TYPE_RANK[bankerType]) {
      return HAND_TYPE_RANK[playerType] > HAND_TYPE_RANK[bankerType]
        ? "player"
        : "banker";
    }

    if (bankerType === "niu" || bankerType === "niuNiu") {
      if (playerNiu !== bankerNiu) {
        return playerNiu > bankerNiu ? "player" : "banker";
      }
    }

    const bankerMax = getMaxCard(bankerCards);
    const playerMax = getMaxCard(playerCards);

    const rankDiff = getCardRankValue(playerMax) - getCardRankValue(bankerMax);
    if (rankDiff !== 0) return rankDiff > 0 ? "player" : "banker";

    return getCardSuitValue(playerMax) > getCardSuitValue(bankerMax)
      ? "player"
      : "banker";
  };

  const finishNiuNiuRound = async () => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setFinishing(true);

    if (!lastRound || !desk) return;

    const bankerHandType = getHandType(cards.banker);
    const bankerNiu = calcNiu(cards.banker);

    const resultKeys: string[] = [];

    (["player1", "player2", "player3"] as Seat[]).forEach((seat, idx) => {
      const playerCards = cards[seat];
      const playerNiu = calcNiu(playerCards);

      const winner = compareHands(
        cards.banker,
        playerCards,
        bankerNiu,
        playerNiu,
      );

      if (winner === "banker") {
        resultKeys.push(`banker${idx + 1}Even`);
        resultKeys.push(`banker${idx + 1}Double`);
      } else {
        resultKeys.push(`${seat}Even`);
        resultKeys.push(`${seat}Double`);
      }
    });

    const resultString = resultKeys.join("|");

    try {
      setIsLoading(true);
      const data = await createResult({
        round_id: lastRound.id,
        game_id: desk.game_id,
        baccarat_type: null,
        result: resultString,
        niu_value: {
          banker_hand_type: bankerHandType,
          banker: bankerNiu,
          player1: calcNiu(cards.player1),
          player2: calcNiu(cards.player2),
          player3: calcNiu(cards.player3),
          hand_type1: getHandType(cards.player1),
          hand_type2: getHandType(cards.player2),
          hand_type3: getHandType(cards.player3),
        },
        cards: {
          first_card: firstCard,
          banker: cards.banker,
          player1: cards.player1,
          player2: cards.player2,
          player3: cards.player3,
        },
      });

      await createNiuniuResult({
        round_id: lastRound.id,
        banker_cards: cards.banker,
        banker_niu_value: bankerNiu,
        banker_hand_type: bankerHandType,
        banker_multiplier: 1,
        players: (["player1", "player2", "player3"] as const).map((seat) => {
          const playerCards = cards[seat];
          const playerNiu = calcNiu(playerCards);

          const win =
            compareHands(cards.banker, playerCards, bankerNiu, playerNiu) ===
            "player";

          return {
            position: seat,
            cards: playerCards,
            niu_value: playerNiu,
            hand_type: getHandType(playerCards),
            result: win ? "win" : "lose",
            multiplier: 1,
          };
        }),
      });

      if (data.success) {
        socket.emit(`desk:${desk?.id}:status`, "finished");
        socket.emit(`desk:${desk?.id}:result`, {
          round_id: data.data.finishedRound.id,
          result: resultString,
          userNetAmounts: data.data.userNetAmounts ?? [],
        });

        await fetchGameInfos();

        setStatus("finished");
        setProgressTimer(5);
        setCards({
          banker: [],
          player1: [],
          player2: [],
          player3: [],
        });
        setFirstCard(null);
        setScannedCard([]);
        setIsManualCardInput(false);
        setDealOrder([]);
        setDealPointer(0);
        setSelectedSuit(null);

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
      console.error("Create Niuniu result error:", err);
      toast.error("派彩结果保存失败，请重试");
      isFinishedRef.current = false;
    } finally {
      setFinishing(false);
      setIsLoading(false);
    }
  };

  const handleInvalidGame = async () => {
    if (!lastRound || !desk) return;

    try {
      setIsLoading(true);

      const res = await invalidGame({
        round_id: lastRound.id,
      });

      if (!res.success) {
        toast.error(res.message || "本局无效失败");
        return;
      }

      setCards({
        banker: [],
        player1: [],
        player2: [],
        player3: [],
      });
      setFirstCard(null);
      setScannedCard([]);
      setDealOrder([]);
      setDealPointer(0);
      setSelectedSuit(null);
      setIsManualCardInput(false);
      setStatus("active");

      isDealingRef.current = false;
      isFinishedRef.current = false;

      socket.emit(`desk:${desk.id}:invalid-game`);
      socket.emit(`desk:${desk.id}:status`, "active");

      await fetchGameInfos();
    } catch (err) {
      console.error("Invalid game error:", err);
      toast.error("本局无效失败");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeatResult = (seat: Seat) => {
    if (!isAllCardsDealt) return null;

    const bankerCards = cards.banker;
    const bankerNiu = calcNiu(bankerCards);

    if (seat === "banker") {
      return {
        text: formatHandText(bankerCards),
        win: false,
      };
    }

    const playerCards = cards[seat];
    const playerNiu = calcNiu(playerCards);

    const winner = compareHands(bankerCards, playerCards, bankerNiu, playerNiu);

    return {
      text: formatHandText(playerCards),
      win: winner === "player",
    };
  };

  const formatHandText = (hand: string[]) => {
    if (isBomb(hand)) return "炸弹";
    if (isFiveFace(hand)) return "5公";

    const niu = calcNiu(hand);
    if (niu === 10) return "牛牛";
    if (niu === 0) return "无牛";
    return `牛 ${niu}`;
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

  const confirmInvalid = async (payload: {
    account: string;
    password: string;
  }) => {
    try {
      setIsLoading(true);

      await confirmAccount({
        ...payload,
        desk_id: Number(desk_id!),
      });

      setInvalidDialogOpen(false);
      handleInvalidGame();
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || "Invalid game failed");
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
    <div className="w-full h-full overflow-hidden flex flex-col">
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
        {/* LEFT SIDE */}
        <div className="col-span-3 bg-[#0b3d0b]">
          <div className="relative flex flex-col pt-16 px-20 gap-4">
            <div className="grid grid-cols-5 gap-4">
              <div className="flex gap-2">
                <img
                  key={firstCard || "arrow"}
                  src={
                    firstCard
                      ? `/images/cards/${firstCard}.jpg`
                      : "/images/cards/arrow.jpg"
                  }
                  className="w-28 h-40 rounded-lg border border-black animate-flipCard"
                />
              </div>
              <div className="col-span-4">
                {(["banker", "player1", "player2", "player3"] as Seat[]).map(
                  (seat) => (
                    <div
                      key={seat}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="text-5xl text-white font-bold">
                        {seat === "banker"
                          ? "庄"
                          : `闲${seat.replace("player", "")}`}
                      </div>

                      <div className="text-6xl text-white font-bold">
                        {isAllCardsDealt &&
                          (() => {
                            const result = getSeatResult(seat);
                            if (!result) return null;

                            return (
                              <div className="text-3xl text-black font-bold">
                                {result.win && seat !== "banker" && "赢 "}
                                {result.text}
                              </div>
                            );
                          })()}
                      </div>

                      <div className="flex gap-2 mt-2">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const cardState = cards[seat][i] || (nextDealSeat === seat && i === nextCardIndex && status === "dealing" ? "arrow" : "back");
                          return (
                            <img
                              key={`${i}-${cardState}`}
                              src={
                                cards[seat][i]
                                  ? `/images/cards/${cards[seat][i]}.jpg`
                                  : nextDealSeat === seat &&
                                      i === nextCardIndex &&
                                      status === "dealing"
                                    ? "/images/cards/arrow.jpg"
                                    : "/images/cards/back.jpg"
                              }
                              className={`w-28 h-40 rounded-lg border border-black ${
                                cardState === "arrow" ? "" : "animate-flipCard"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            {isManualCardInput ? (
              <CardInputPanel
                selectedSuit={selectedSuit}
                status={status}
                onSuit={setSelectedSuit}
                onRank={handleSelectCard}
                onDelete={handleDeleteLastCard}
                canFinish={isAllCardsDealt}
                onFinish={finishNiuNiuRound}
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

                <Button
                  variant="info"
                  hidden={!isAllCardsDealt}
                  onClick={() => finishNiuNiuRound()}
                  className="text-2xl px-6 py-7"
                >
                  派彩
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-yellow-100 p-1 flex flex-col h-full gap-15">
          <div className="flex">
            <div className="text-7xl font-bold text-gray-700">
              {dateStr} <span className="text-6xl">{timeStr}</span>
            </div>
          </div>
          <div className="w-full p-4 mt-auto">
            <div className="w-full flex flex-col items-center py-3">
              <div className="text-[250px] leading-none font-bold text-black">
                {timer}
              </div>

              <input
                type="number"
                placeholder="点此回车"
                value={addTime}
                onChange={(e) => setAddTime(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addTime) {
                    setTimer((prev) => prev + Number(addTime));
                    setAddTime("");
                  }
                }}
                disabled={status !== "betting"}
                className="mt-4 w-40 text-3xl px-3 py-1 border-2 border-gray-700 rounded bg-white"
              />
            </div>

            <div className="flex flex-col gap-5 mt-10">
              <Button
                onClick={startBetting}
                disabled={status === "dealing" || status === "finished"}
                variant="default"
                className="w-full text-white text-4xl py-12"
              >
                {status === "betting" && `停止下注 (${timer})`}
                {status === "dealing" && "停止下注"}
                {status === "active" && "开始下注"}
                {status === "finished" && `牌局结算中 (${progressTimer})`}
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={() => setChangeDialogOpen(true)}
                  disabled={!(status === "active" || status === "finished")}
                  variant="default"
                  className="flex-1 text-white text-3xl py-12"
                >
                  换靴
                </Button>

                <Button
                  disabled={status !== "dealing"}
                  onClick={() => setInvalidDialogOpen(true)}
                  variant="default"
                  className="flex-1 text-white text-3xl py-12"
                >
                  本局无效
                </Button>
              </div>
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

      <EditDialog
        open={invalidDialogOpen}
        onConfirm={confirmInvalid}
        onCancel={() => setInvalidDialogOpen(false)}
      />
    </div>
  );
};

export default Index;
