import { Desk } from "@/types";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRoundResult } from "@/hooks/useRoundResult";
import { useNiuniuCardBoardContext } from "@/contexts/NiuniuCardBoardContext";

interface GamePlayerProps {
  desk: Desk;
}

type Seat = "banker" | "player1" | "player2" | "player3";

const emptyCards = {
  banker: [],
  player1: [],
  player2: [],
  player3: [],
};

const CardBoard: React.FC<GamePlayerProps> = ({ desk }) => {
  const { cardState, clearDeskCardsAfterDelay } = useNiuniuCardBoardContext();
  const deskCardState = desk ? cardState[desk.id] : null;
  const firstCard = deskCardState?.firstCard ?? null;

  const triggerCard =
    deskCardState?.cards.banker.length === 5 &&
    deskCardState?.cards.player1.length === 5 &&
    deskCardState?.cards.player2.length === 5 &&
    deskCardState?.cards.player3.length === 5;

  const cards = deskCardState?.cards ?? emptyCards;
  const [resultMap, setResultMap] = useState<Record<Seat, string>>({
    banker: "",
    player1: "",
    player2: "",
    player3: "",
  });

  useEffect(() => {
    const seats: Seat[] = ["banker", "player1", "player2", "player3"];

    setResultMap((prev) => {
      const next = { ...prev };

      seats.forEach((seat) => {
        if (cards[seat].length === 5) {
          next[seat] = formatNiu(cards[seat]);
        } else if (cards[seat].length < 5) {
          next[seat] = "";
        }
      });

      return next;
    });
  }, [cards]);

  const getRank = (card: string) => card.slice(1);

  const niuPoint = (rank: string) => {
    if (["J", "Q", "K"].includes(rank)) return 10;
    if (rank === "1") return 1;
    return Number(rank);
  };

  const calcNiu = (cards: string[]) => {
    const values = cards.map((c) => niuPoint(getRank(c)));

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

  const isBomb = (cards: string[]) => {
    const count: Record<string, number> = {};
    cards.forEach((c) => {
      const rank = getRank(c);
      count[rank] = (count[rank] || 0) + 1;
    });
    return Object.values(count).includes(4);
  };

  const isFiveFace = (cards: string[]) => {
    return cards.every((c) => ["J", "Q", "K"].includes(getRank(c)));
  };

  const formatNiu = (cards: string[]) => {
    if (isBomb(cards)) return "炸弹";

    if (isFiveFace(cards)) return "5公";

    const n = calcNiu(cards);

    if (n === 10) return "牛牛";
    if (n === 0) return "无牛";
    return `牛${n}`;
  };

  useRoundResult({
    deskId: desk.id,
    lastRoundId: desk.last_round?.id,
    triggerCard: triggerCard ? "lastCard" : null,
    onPollResult: () => {
      clearDeskCardsAfterDelay(desk.id, 5000);
    },
  });

  return (
    <>
      {firstCard && (
        <div className="flex flex-wrap justify-between gap-1 py-2 p-1 w-full bg-black/70">
          {/* ARROW CARD SLOT */}
          <div className="shadow-lg bg-transparent flex justify-center items-center">
            <div className="border-3 border-green-500 rounded-xl p-1">
              <img
                src={`/images/cards/${firstCard}.jpg`}
                className="w-22 h-32 rounded-sm animate-slideDown"
              />
            </div>
          </div>

          {/* BANKER + PLAYERS */}
          {(["banker", "player1", "player2", "player3"] as Seat[]).map(
            (seat) => (
              <div
                key={seat}
                className={cn(
                  "shadow-lg p-0 flex justify-center items-center",
                  seat === "banker"
                    ? "border-none"
                    : "border-3 rounded-xl border-blue-500",
                )}
              >
                <div
                  className={cn(
                    "grid gap-2 justify-items-center",
                    seat === "banker"
                      ? "grid-cols-6 border-3 border-red-500 rounded-xl"
                      : "grid-cols-3",
                  )}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-22 h-32 p-1">
                      {cards[seat][i] && (
                        <img
                          src={`/images/cards/${cards[seat][i]}.jpg`}
                          className="object-contain rounded-sm animate-slideDown"
                        />
                      )}
                    </div>
                  ))}

                  <div className="flex flex-col justify-between font-bold text-2xl p-3">
                    <span
                      className={cn(
                        seat === "banker" ? "text-red-500" : "text-blue-500",
                      )}
                    >
                      {seat === "banker"
                        ? "庄"
                        : `闲${seat.replace("player", "")}`}
                    </span>
                    <span className="text-white">{resultMap[seat]}</span>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </>
  );
};

export default CardBoard;
