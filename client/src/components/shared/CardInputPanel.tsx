import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CardInputPanelStatus =
  | "active"
  | "betting"
  | "dealing"
  | "finished";

interface CardInputPanelProps {
  selectedSuit: string | null;
  status: CardInputPanelStatus;
  onSuit: (suit: string) => void;
  onRank: (rank: string) => void;
  onDelete: () => void;
  canFinish: boolean;
  onFinish: () => void;
  finishing?: boolean;
}

const SUITS = [
  { key: "S", label: "♠", color: "text-black" },
  { key: "H", label: "♥", color: "text-red-600" },
  { key: "C", label: "♣", color: "text-black" },
  { key: "D", label: "♦", color: "text-red-600" },
];

const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

export const CardInputPanel = ({
  selectedSuit,
  status,
  onSuit,
  onRank,
  onDelete,
  canFinish,
  onFinish,
  finishing = false,
}: CardInputPanelProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Suits */}
      <div className="flex items-center">
        <div className="flex gap-4 justify-center flex-1">
          {SUITS.map((s) => {
            const isSelected = selectedSuit === s.key;

            return (
              <Button
                key={s.key}
                variant={isSelected ? "ghost" : "success"}
                className={cn(
                  "text-5xl px-6 py-7",
                  s.color,
                  isSelected && "ring-4 ring-white",
                )}
                onClick={() => onSuit(s.key)}
              >
                {s.label}
              </Button>
            );
          })}
        </div>

        <Button
          variant="info"
          className="text-2xl px-6 py-7 ml-auto"
          disabled={status !== "dealing" || finishing}
          onClick={onDelete}
        >
          清除一张
        </Button>
      </div>

      {/* Ranks */}
      <div className="grid grid-cols-14 gap-2">
        {RANKS.map((r) => (
          <Button
            key={r}
            variant="success"
            className="text-4xl py-7 text-black"
            onClick={() => onRank(r)}
          >
            {r}
          </Button>
        ))}
        <Button
          variant="info"
          disabled={!canFinish || finishing}
          onClick={onFinish}
          className="text-2xl px-6 py-7"
        >
          派彩
        </Button>
      </div>
    </div>
  );
};

export default CardInputPanel;
