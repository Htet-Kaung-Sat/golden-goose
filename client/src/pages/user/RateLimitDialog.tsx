import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Desk, Game } from "@/types";
import { Result } from "@/types/Result";
import { User } from "@/types/User";
import { cn } from "@/lib/utils";
import { getRateLimit } from "@/utils/helper";

interface RateLimitDialogProps {
  open: boolean;
  onClose?: () => void;
  desk: Desk;
  game: Game;
  user: User | null;
  /** When true, render as inline panel (no modal); use below showInfo in GamePlayer */
  inline?: boolean;
}

const BORDER_COLOR = "#f3f4f7";

/**
 * Dialog showing result rate limits (限红): grid of bet types with min-max ranges.
 * Style: dark brown background, white text, thin separators between cells.
 */
const GRID_SIZE = 12;

const RateLimitDialog: React.FC<RateLimitDialogProps> = ({
  open,
  onClose,
  desk,
  game,
  user,
  inline = false,
}) => {
  const rateLimit =
    user && desk?.game_id ? getRateLimit(user, desk.game_id) : null;

  const resultsForDesk: Result[] = React.useMemo(() => {
    if (!game?.results) return [];
    return game.results.filter((r) => r.key !== "superthreeSix");
  }, [game?.results]);

  const limitRows = React.useMemo(() => {
    if (!rateLimit?.results || !resultsForDesk.length) return [];
    const byKey = new Map<
      string,
      { name: string; min_bet: number; max_bet: number }
    >();
    for (const result of resultsForDesk) {
      if (result.id == null) continue;
      const rrl = rateLimit.results.find(
        (r) => r.result_id === (result.id as number),
      );
      const name = result.name ?? result.key;
      const min_bet = rrl?.min_bet ?? 0;
      const max_bet = rrl?.max_bet ?? 0;
      const existing = byKey.get(result.key);
      if (!existing) {
        byKey.set(result.key, { name, min_bet, max_bet });
      } else {
        existing.min_bet = Math.min(existing.min_bet, min_bet);
        existing.max_bet = Math.max(existing.max_bet, max_bet);
      }
    }
    return Array.from(byKey.entries())
      .map(([, row]) => row)
      .filter((row) => row.name);
  }, [rateLimit?.results, resultsForDesk]);

  const gridItems = limitRows.slice(0, GRID_SIZE);
  const fullWidthItems = limitRows.slice(GRID_SIZE);
  const gridCells = Array.from(
    { length: GRID_SIZE },
    (_, i) => gridItems[i] ?? null,
  );

  const panelContent = (
    <div
      className="overflow-hidden rounded-lg bg-green-900/90 border w-100 max-w-[25rem]"
      style={{
        borderColor: BORDER_COLOR,
      }}
    >
      <div>
        <div className="grid grid-cols-3 border-collapse">
          {gridCells.map((row, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-2 min-h-[52px]",
                i < GRID_SIZE - 3 && "border-b-3",
              )}
              style={{
                borderColor: BORDER_COLOR,
              }}
            >
              {row ? (
                <>
                  <span className="text-white text-sm font-medium">
                    {row.name}
                  </span>
                  <span className="text-white/95 text-xs mt-0.5">
                    {row.min_bet}-{row.max_bet}
                  </span>
                </>
              ) : null}
            </div>
          ))}
        </div>
        {fullWidthItems.length > 0 && (
          <div
            className="flex flex-col items-center justify-center py-3 px-2 border-b"
            style={{ borderColor: BORDER_COLOR }}
          >
            {fullWidthItems.map((row, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center"
              >
                <span className="text-white text-sm font-medium">
                  {row.name}
                </span>
                <span className="text-white/95 text-xs mt-0.5">
                  {row.min_bet}-{row.max_bet}
                </span>
              </div>
            ))}
          </div>
        )}
        {limitRows.length === 0 && (
          <div className="py-6 text-center text-white/80 text-sm">
            暂无限红数据
          </div>
        )}
      </div>
    </div>
  );

  if (inline) {
    if (!open) return null;
    return panelContent;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden rounded-lg border max-w-sm w-[min(90vw,22rem)]"
        style={{
          borderColor: BORDER_COLOR,
        }}
        overlayClassName="bg-black/60"
      >
        {panelContent}
      </DialogContent>
    </Dialog>
  );
};

export default RateLimitDialog;
