import { Desk } from "@/types";
import { cn } from "@/lib/utils";
import { useCardBoardContext } from "@/contexts/CardBoardContext";
import { useRoundResult } from "@/hooks/useRoundResult";

interface GamePlayerProps {
  desk: Desk;
}

const CardBoard: React.FC<GamePlayerProps> = ({ desk }) => {
  const { cardState, clearDeskCardsAfterDelay } = useCardBoardContext();
  const deskCardState = desk ? cardState[desk.id] : null;
  const dragonCard = deskCardState?.dragon ?? null;
  const tigerCard = deskCardState?.tiger ?? null;

  const { winners } = useRoundResult({
    deskId: desk.id,
    lastRoundId: desk.last_round?.id,
    triggerCard: tigerCard,
    onPollResult: () => {
      clearDeskCardsAfterDelay(desk.id, 5000);
    },
  });

  const getPoint = (card: string | null) => {
    if (!card) return "";

    const rank = card.slice(1);

    const rankMap: Record<string, string> = {
      A: "1",
      J: "11",
      Q: "12",
      K: "13",
    };

    return rankMap[rank] ?? rank;
  };

  if (!dragonCard && !tigerCard) return null;

  return (
    <>
      <div className="flex w-full bg-black/80 overflow-hidden py-1 gap-5 border-2 border-white/20">
        <div
          className={cn(
            "flex-1 bg-red-800/30 flex items-end justify-center py-5 transition-all duration-500 border-4",
            winners.includes("dragon")
              ? "animate-flash-border border-yellow-400"
              : "border-transparent",
          )}
        >
          <div className="flex items-center gap-2">
            {/* DRAGON */}
            <div className="flex items-center">
              {dragonCard && (
                <img
                  src={`/images/cards/${dragonCard}.jpg`}
                  className="w-28 h-40 rounded-lg shadow-md z-20 animate-slideDown"
                />
              )}
            </div>

            <div className="flex flex-col items-center text-white font-bold text-3xl">
              <span>龙</span>
              <span className="text-white text-xl">{getPoint(dragonCard)}</span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "flex-1 bg-blue-800/30 flex py-2 justify-center transition-all duration-500 border-4",
            winners.includes("tiger")
              ? "animate-flash-border border-yellow-400"
              : "border-transparent",
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center text-white font-bold text-3xl">
              <span>虎</span>
              <span className="text-white text-xl">{getPoint(tigerCard)}</span>
            </div>

            {/* TIGER */}
            <div className="flex items-center">
              {tigerCard && (
                <img
                  src={`/images/cards/${tigerCard}.jpg`}
                  className="w-28 h-40 rounded-lg shadow-md z-20 animate-slideDown"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CardBoard;
