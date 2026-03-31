/**
 * GamePlayerRightSideDesks Component
 *
 * A slide-out panel component for selecting game desks/tables.
 * Features:
 * - Toggle button (hamburger icon) to open/close the panel
 * - Filter buttons to filter desks by game type (All, Baccarat, Longhu, Niuniu)
 * - List of available desks with click-to-select functionality
 * - Smooth slide-in/out animation
 * - Dark theme with golden accents matching the gaming platform
 * - Lazy-rendered roadmaps: only desks visible in the viewport render ResultTable (canvas roadmaps).
 */

import { useState } from "react";
import { LazyDeskCard } from "@/components/shared/LazyDeskCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Desk } from "@/types";

type DeskFilterType = "ALL" | "BACCARAT" | "LONGHU" | "NIUNIU";

const GamePlayerRightSideDesks = ({
  desks,
  onSelectDesk,
  showDeskPanel,
  setShowDeskPanel,
  onDeskPanelOpen,
}: {
  desks: Desk[];
  onSelectDesk: (desk: Desk) => void;
  showDeskPanel: boolean;
  setShowDeskPanel: (show: boolean) => void;
  onDeskPanelOpen?: () => void;
}) => {
  const [deskFilter, setDeskFilter] = useState<DeskFilterType>("ALL");

  const filteredPanelDesks = desks.filter((desk) => {
    if (!desk.game) return false;
    if (deskFilter === "ALL") return true;
    if (deskFilter === "BACCARAT") return desk.game.type === "BACCARAT";
    if (deskFilter === "LONGHU") return desk.game.type === "LONGHU";
    if (deskFilter === "NIUNIU") return desk.game.type === "NIUNIU";
    return true;
  });
  return (
    <div className="relative bg-[#1e1611] overflow-hidden">
      {/* Overlay backdrop - dims background when panel is open */}
      {showDeskPanel && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowDeskPanel(false)}
        />
      )}
      {/* Right Desk Panel - slides in from right side of screen */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[600px] z-50",
          "bg-gradient-to-b from-[#3a2a1b] to-[#1f150d]",
          "border-l border-yellow-600/30",
          "transition-transform duration-300 ease-out",
          "flex flex-col",
          showDeskPanel ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Toggle button anchored to the left edge of the panel */}
        <button
          onClick={() => {
            setShowDeskPanel(!showDeskPanel);
            onDeskPanelOpen?.();
          }}
          className={cn(
            "absolute top-1/2 -left-12 -translate-y-1/2 w-12 h-36",
            "bg-[#3a2a1b] border border-yellow-600/40 border-r-0",
            "rounded-none rounded-l-4xl px-6",
            "text-yellow-300",
            "hover:shadow-[0_0_14px_rgba(210,155,36,0.4)]",
            "flex items-center justify-center cursor-pointer",
          )}
        >
          <span className="-rotate-90 text-3xl hover:scale-105 transition-transform duration-300 tracking-wide whitespace-nowrap">
            椅桌
          </span>
        </button>

        {/* Desk List - scrollable list of available game desks (roadmaps lazy-rendered when in view) */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-hide">
          {filteredPanelDesks.map((desk) => (
            <LazyDeskCard
              key={desk.id}
              desk={desk}
              onSelect={() => {
                onSelectDesk(desk);
                setShowDeskPanel(false);
              }}
            />
          ))}
        </div>

        {/* Footer Filter - filter buttons for desk types, equal width buttons */}
        <div className="flex gap-3 p-6 border-t border-yellow-600/30 bg-[#2a1c12]">
          <Button
            onClick={() => setDeskFilter("ALL")}
            variant={deskFilter === "ALL" ? "default" : "secondary"}
            className={cn(
              "casino-gold-btn flex-1 h-16 text-3xl rounded-none rounded-tl-2xl",
              deskFilter === "ALL" && "casino-gold-active",
            )}
          >
            全部
          </Button>

          <Button
            onClick={() => setDeskFilter("BACCARAT")}
            variant={deskFilter === "BACCARAT" ? "default" : "secondary"}
            className={cn(
              "casino-gold-btn flex-1 h-16 text-3xl rounded-none rounded-tl-2xl",
              deskFilter === "BACCARAT" && "casino-gold-active",
            )}
          >
            百家乐
          </Button>

          <Button
            onClick={() => setDeskFilter("LONGHU")}
            variant={deskFilter === "LONGHU" ? "default" : "secondary"}
            className={cn(
              "casino-gold-btn flex-1 h-16 text-3xl rounded-none rounded-tl-2xl",
              deskFilter === "LONGHU" && "casino-gold-active",
            )}
          >
            龙虎
          </Button>
          <Button
            onClick={() => setDeskFilter("NIUNIU")}
            variant={deskFilter === "NIUNIU" ? "default" : "secondary"}
            className={cn(
              "casino-gold-btn flex-1 h-16 text-3xl rounded-none rounded-tl-2xl",
              deskFilter === "NIUNIU" && "casino-gold-active",
            )}
          >
            牛牛
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GamePlayerRightSideDesks;
