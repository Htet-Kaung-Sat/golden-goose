import { useRoundResult } from "@/hooks/useRoundResult";
import { cn } from "@/lib/utils";
import { Desk } from "@/types";
import { useCardBoardContext } from "@/contexts/CardBoardContext";

interface GamePlayerProps {
  desk: Desk;
}

/**
 * Baccarat G card board: shows player/banker cards from CardBoardContext.
 * Uses shared useRoundResult (socket + poll) for winner highlight; clears desk cards
 * after delay when result is received (including from poll), same as longhu CardBoard.
 */
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

  const CardSlot = ({ card }: { card: string | null }) => (
    <div className="w-32 h-[200px] flex items-center justify-center">
      {card && (
        <img
          src={`/images/cards/${card}.jpg`}
          className="w-full h-full rounded-md shadow-md animate-slideDown"
        />
      )}
    </div>
  );

  return (
    <>
      {hasAnyPlayerCard && (
        <div className="flex w-full bg-black/80 overflow-hidden gap-5 border-2 border-white/20">
          <div
            className={cn(
              "flex-1 bg-blue-800/30 flex items-end justify-end p-5 transition-all duration-500 border-4",
              winners.includes("player")
                ? "animate-flash-border border-yellow-400"
                : "border-transparent",
            )}
          >
            <div className="flex items-center gap-5 py-4">
              {/* PLAYER */}
              <div className="flex gap-4">
                {displayPlayerCards.map((card, i) => (
                  <CardSlot key={i} card={card} />
                ))}
              </div>

              <div className="flex flex-col items-center text-white font-bold text-5xl ml-12">
                <span>闲</span>
                <span className="text-white text-xl">{playerPoint}</span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex-1 bg-red-800/30 flex p-5 transition-all duration-500 border-4",
              winners.includes("banker")
                ? "animate-flash-border border-yellow-400"
                : "border-transparent",
            )}
          >
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center text-white font-bold text-5xl mr-12">
                <span>庄</span>
                <span className="text-white text-xl">{bankerPoint}</span>
              </div>

              {/* BANKER */}
              <div className="flex gap-4">
                {displayBankerCards.map((card, i) => (
                  <CardSlot key={i} card={card} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CardBoard;
