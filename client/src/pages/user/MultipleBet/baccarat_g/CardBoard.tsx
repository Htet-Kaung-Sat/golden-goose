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
  const playerCards = {
    p1: deskCardState?.player?.p1 ?? null,
    p2: deskCardState?.player?.p2 ?? null,
    p3: deskCardState?.player?.p3 ?? null,
  };
  const bankerCards = {
    b1: deskCardState?.banker?.b1 ?? null,
    b2: deskCardState?.banker?.b2 ?? null,
    b3: deskCardState?.banker?.b3 ?? null,
  };

  const { winners } = useRoundResult({
    deskId: desk.id,
    lastRoundId: desk.last_round?.id,
    triggerCard: bankerCards.b2,
    onPollResult: () => {
      clearDeskCardsAfterDelay(desk.id, 5000);
    },
  });

  const getRank = (card: string) => {
    return card.slice(1);
  };

  const baccaratPoint = (rank: string) => {
    if (["10", "J", "Q", "K"].includes(rank)) return 0;
    return Number(rank);
  };

  const calculateDisplayPoint = (cards: string[]) => {
    if (cards.length === 0) return 0;

    if (cards.length === 1) {
      return baccaratPoint(getRank(cards[0]));
    }

    const total = cards.reduce((sum, card) => {
      return sum + baccaratPoint(getRank(card));
    }, 0);

    return total % 10;
  };

  const toCardArray = (obj: Record<string, string | null>) =>
    Object.values(obj).filter(Boolean) as string[];

  const playerPoint = calculateDisplayPoint(toCardArray(playerCards));
  const bankerPoint = calculateDisplayPoint(toCardArray(bankerCards));

  const displayPlayerCards = [playerCards.p3, playerCards.p1, playerCards.p2];
  const displayBankerCards = [bankerCards.b1, bankerCards.b2, bankerCards.b3];
  const hasAnyPlayerCard = Object.values(playerCards).some(Boolean);

  return (
    <>
      {hasAnyPlayerCard && (
        <div className="flex w-full bg-black/80 overflow-hidden py-5 gap-3 border-2 border-white/20">
          <div
            className={cn(
              "flex-1 bg-blue-800/30 flex items-end justify-end transition-all duration-500 border-4",
              winners.includes("player")
                ? "animate-flash-border border-yellow-400"
                : "border-transparent",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <div className="flex gap-1">
                  {[1, 2].map((index) => {
                    const card = displayPlayerCards[index];

                    return (
                      <div
                        key={index}
                        className="w-16 h-[100px] flex items-center justify-center"
                      >
                        {card && (
                          <img
                            src={`/images/cards/${card}.jpg`}
                            className="w-16 rounded-md shadow-md animate-slideDown"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center h-[70px]">
                  <div className="w-16 flex items-center justify-center rotate-90">
                    {displayPlayerCards[0] && (
                      <img
                        src={`/images/cards/${displayPlayerCards[0]}.jpg`}
                        className="w-16 rounded-md shadow-md animate-slideDown"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center text-white font-bold text-3xl">
                <span>闲</span>
                <span className="text-white text-xl">{playerPoint}</span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex-1 bg-red-800/30 flex transition-all duration-500 border-4",
              winners.includes("banker")
                ? "animate-flash-border border-yellow-400"
                : "border-transparent",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center text-white font-bold text-3xl">
                <span>庄</span>
                <span className="text-white text-xl">{bankerPoint}</span>
              </div>

              <div className="flex flex-col">
                <div className="flex gap-1">
                  {[0, 1].map((index) => {
                    const card = displayBankerCards[index];

                    return (
                      <div
                        key={index}
                        className="w-16 h-[100px] flex items-center justify-center"
                      >
                        {card && (
                          <img
                            src={`/images/cards/${card}.jpg`}
                            className="w-16 rounded-md shadow-md animate-slideDown"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-center h-[70px]">
                  <div className="w-16 flex items-center justify-center rotate-90">
                    {displayBankerCards[2] && (
                      <img
                        src={`/images/cards/${displayBankerCards[2]}.jpg`}
                        className="w-16 rounded-md shadow-md animate-slideDown"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CardBoard;
