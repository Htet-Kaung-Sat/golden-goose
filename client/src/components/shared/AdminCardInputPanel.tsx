import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminCardInputPanelStatus =
  | "active"
  | "betting"
  | "dealing"
  | "finished";

interface AdminCardInputPanelProps {
  selectedSuit: string | null;
  status: AdminCardInputPanelStatus;
  onSuit: (suit: string) => void;
  onRank: (rank: string) => void;
  onDelete: () => void;
  canFinish: boolean;
  onFinish: () => void;
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

export const AdminCardInputPanel = ({
  selectedSuit,
  status,
  onSuit,
  onRank,
  onDelete,
  canFinish,
  onFinish,
}: AdminCardInputPanelProps) => {
  return (
    <div className="flex flex-col gap-2 items-center w-full">
      <div className="flex flex-col gap-2 justify-center w-full">
        {/* Suits */}
        <div className="flex items-center justify-center">
          <div className="flex gap-2 justify-center flex-1">
            {SUITS.map((s) => {
              const isSelected = selectedSuit === s.key;

              return (
                <Button
                  key={s.key}
                  variant={isSelected ? "ghost" : "adminPanel"}
                  className={cn(
                    "lg:text-5xl lg:px-3 lg:py-6 md:text-4xl md:px-3 md:py-3 text-2xl px-3 py-3",
                    s.color,
                    isSelected && "ring-3 ring-green-700 hover:text-green-900",
                  )}
                  onClick={() => onSuit(s.key)}
                >
                  {s.label}
                </Button>
              );
            })}
          </div>
        </div>
        {/* Ranks */}
        <div className="flex md:gap-2 gap-1 justify-center flex-wrap">
          {RANKS.map((r) => (
            <Button
              key={r}
              variant="adminPanel"
              className="md:text-2xl text-lg lg:py-7 md:px-5 px-4 text-black"
              onClick={() => onRank(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>
      <div className="w-full flex justify-center mb-2 gap-5">
        <div>
          <Button
            variant="info"
            disabled={!canFinish}
            onClick={onFinish}
            className="text-lg md:text-2xl py-6"
          >
            派彩
          </Button>
        </div>
        <div>
          <Button
            variant="info"
            className="text-lg md:text-2xl py-6"
            disabled={status !== "dealing"}
            onClick={onDelete}
          >
            清除一张
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminCardInputPanel;
