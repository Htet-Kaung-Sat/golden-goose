import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import CoinBoard from "./CoinBoard";
import { Camera, Desk, Game } from "@/types";
import NResultTable from "./baccarat_n/ResultTable";
import BResultTable from "./baccarat_b/ResultTable";
import GResultTable from "./baccarat_g/ResultTable";
import BaccaratCardBoard from "./baccarat_g/CardBoard";
import LonghuResultTable from "./longhu/ResultTable";
import LonghuCardBoard from "./longhu/CardBoard";
import { useEffect, useRef, useState } from "react";
import VideoIframe from "../VideoIframe";
import { Button } from "@/components/ui/button";
import { LazyDeskCard } from "@/components/shared/LazyDeskCard";
import { useGameContext } from "@/contexts/GameContext";

interface MultipleBetProps {
  desks: Desk[];
  games: Game[];
  cameras: Camera[];
  onExpandDesk: (desk: Desk) => void;
}

type DeskFilterType = "ALL" | "BACCARAT" | "LONGHU";

export type SelectedCoin = {
  value: number;
};

const Index: React.FC<MultipleBetProps> = ({
  desks,
  games,
  cameras,
  onExpandDesk,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showDeskPanel, setShowDeskPanel] = useState(false);
  const [deskFilter, setDeskFilter] = useState<DeskFilterType>("ALL");
  const {
    multipleDesks,
    setMultipleDesks,
    amount,
    setAmount,
    selectedCoin,
    setSelectedCoin,
  } = useGameContext();
  const [cameraIndexes, setCameraIndexes] = useState<Record<number, number>>(
    {},
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: scrollRef.current.scrollWidth,
      behavior: "smooth",
    });
  }, [desks.length]);

  const getDeskCameras = (deskId: number) => {
    const deskCameras = cameras.filter((c) => c.desk_id === deskId);
    return deskCameras;
  };

  const handleSwapCamera = (deskId: number, total: number) => {
    if (total <= 1) return;

    setCameraIndexes((prev) => ({
      ...prev,
      [deskId]: ((prev[deskId] ?? 0) + 1) % total,
    }));
  };

  const filteredPanelDesks = desks.filter((desk) => {
    if (!desk.game) return false;
    if (desk.game.type === "NIUNIU") return false;

    if (multipleDesks.some((d) => d.id === desk.id)) return false;

    if (deskFilter === "ALL") return true;
    if (deskFilter === "BACCARAT") return desk.game.type === "BACCARAT";
    if (deskFilter === "LONGHU") return desk.game.type === "LONGHU";

    return true;
  });

  return (
    <div className="relative w-full h-full bg-[url('/images/goose.png')] bg-cover bg-center overflow-hidden">
      <div className="absolute inset-0 bg-green-900/20 backdrop-blur-sm pointer-events-none z-0" />
      <div className="relative z-10 w-full h-full">
        <div
          ref={scrollRef}
          onWheel={(e) => {
            if (!scrollRef.current) return;
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              scrollRef.current.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
          className={cn(
            "flex gap-3 px-3 py-6 scrollbar-hide",
            "overflow-x-auto overflow-y-hidden",
            "scroll-smooth whitespace-nowrap",
            "scrollbar-thin scrollbar-thumb-yellow-600/40",
          )}
        >
          {multipleDesks.map((desk) => {
            const deskCameras = getDeskCameras(desk.id);
            const cameraIndex = cameraIndexes[desk.id] ?? 0;
            const currentCamera = deskCameras[cameraIndex];

            return (
              <div
                key={desk.id}
                className="relative w-[385px] h-[780px] flex-shrink-0 bg-gray-900 rounded-lg border border-yellow-600/30 overflow-hidden"
              >
                <div
                  className={cn(
                    "absolute top-0 left-0 right-0 z-20 h-14 px-4",
                    "flex items-center justify-between",
                    "bg-gradient-to-b from-green-900/20 to-green-900/20",
                    "border-b border-yellow-600/30",
                  )}
                >
                  <span className="text-2xl text-white font-semibold tracking-wide">
                    {desk.name}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      className="text-white hover:scale-110 cursor-pointer transition-transform"
                      onClick={() => onExpandDesk(desk)}
                    >
                      <Icon
                        icon="material-symbols:exit-to-app-rounded"
                        width={26}
                      />
                    </button>

                    <button
                      className="text-yellow-400 hover:text-red-500 cursor-pointer hover:scale-120 transition-transform"
                      onClick={() =>
                        setMultipleDesks((prev) =>
                          prev.filter((d) => d.id !== desk.id),
                        )
                      }
                    >
                      <Icon icon="mdi:close" width={26} />
                    </button>
                  </div>
                </div>

                <div className="relative mt-12 p-1">
                  {currentCamera ? (
                    <>
                      <VideoIframe src={currentCamera.url} />

                      {deskCameras.length > 1 && (
                        <button
                          onClick={() =>
                            handleSwapCamera(desk.id, deskCameras.length)
                          }
                          className="absolute bottom-5 right-5 z-30 bg-[#2c1f16] cursor-pointer text-white p-1 rounded-sm hover:scale-110 transition"
                        >
                          <Icon
                            icon="streamline-ultimate:expand-full"
                            width="32"
                            height="32"
                          />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="w-full aspect-video flex items-center justify-center text-gray-400">
                      No Camera
                    </div>
                  )}
                </div>

                {desk.game?.type === "BACCARAT" && (
                  <div className="absolute bottom-0 border-neutral-700 left-0 w-full">
                    {desk?.baccarat_type === "N" && (
                      <NResultTable
                        desk={desks.find((d) => d.id === desk.id)!}
                        game={games.find((g) => g.id === desk.game_id)!}
                        selectedCoin={selectedCoin}
                        amount={amount}
                        setAmount={setAmount}
                      />
                    )}
                    {desk?.baccarat_type === "B" && (
                      <BResultTable
                        desk={desks.find((d) => d.id === desk.id)!}
                        game={games.find((g) => g.id === desk.game_id)!}
                        selectedCoin={selectedCoin}
                        amount={amount}
                        setAmount={setAmount}
                      />
                    )}
                    {desk?.baccarat_type === "G" && (
                      <>
                        <GResultTable
                          desk={desks.find((d) => d.id === desk.id)!}
                          game={games.find((g) => g.id === desk.game_id)!}
                          selectedCoin={selectedCoin}
                          amount={amount}
                          setAmount={setAmount}
                        />
                        <div className="absolute bottom-0 left-0 w-full">
                          <BaccaratCardBoard
                            desk={desks.find((d) => d.id === desk.id)!}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {desk.game?.type === "LONGHU" && (
                  <div className="absolute bottom-0 border-neutral-700 left-0 w-full">
                    <LonghuResultTable
                      desk={desks.find((d) => d.id === desk.id)!}
                      game={games.find((g) => g.id === desk.game_id)!}
                      selectedCoin={selectedCoin}
                      amount={amount}
                      setAmount={setAmount}
                    />
                    <div className="absolute bottom-0 left-0 w-full">
                      <LonghuCardBoard
                        desk={desks.find((d) => d.id === desk.id)!}
                      />
                    </div>
                  </div>
                )}

                <div className="absolute top-14 left-0 right-0 bottom-0 pointer-events-none" />
              </div>
            );
          })}

          <div className="relative w-[385px] h-[780px] flex-shrink-0 bg-[#3a2a1b] rounded-lg border border-yellow-600/30 overflow-hidden hover:border-yellow-600/60 hover:shadow-[0_0_20px_rgba(210,155,36,0.25)]">
            <div
              onClick={() => setShowDeskPanel(true)}
              className={cn(
                "h-[780px] flex flex-col items-center justify-center",
                "bg-gradient-to-b from-green-900 to-green-700",
                "border border-yellow-600/30 rounded-lg cursor-pointer",
                "hover:shadow-[0_0_20px_rgba(210,155,36,0.25)]",
              )}
            >
              <div className="w-20 h-20 rounded-full border-3 border-yellow-500 flex items-center justify-center mb-4">
                <Icon icon="mdi:plus" className="text-yellow-400" width={48} />
              </div>
              <span className="text-3xl text-white tracking-wide">
                添加桌台
              </span>
            </div>
          </div>
        </div>

        {/* Overlay */}
        {showDeskPanel && (
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowDeskPanel(false)}
          />
        )}

        {/* Right Desk Panel */}
        <div
          className={cn(
            "fixed top-0 right-0 h-full w-[600px] z-50",
            "bg-green-900",
            "border-l border-yellow-500",
            "transition-transform duration-300 ease-out",
            "flex flex-col",
            showDeskPanel ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-primary border-yellow-500">
            <span className="text-3xl text-white font-bold">选择桌台</span>
            <Icon
              icon="mdi:close"
              className="text-yellow-400 cursor-pointer"
              width={32}
              onClick={() => setShowDeskPanel(false)}
            />
          </div>

          {/* Desk List - roadmaps lazy-rendered when in view */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {filteredPanelDesks.map((desk) => (
              <LazyDeskCard
                key={desk.id}
                desk={desk}
                onSelect={() => {
                  setMultipleDesks((prev) => {
                    if (prev.some((d) => d.id === desk.id)) return prev;
                    return [...prev, desk];
                  });
                  setShowDeskPanel(false);
                }}
              />
            ))}
          </div>

          {/* Footer Filter */}
          <div className="flex gap-3 p-4 border-t border-yellow-500 bg-primary">
            <Button
              onClick={() => setDeskFilter("ALL")}
              variant={deskFilter === "ALL" ? "default" : "secondary"}
              className={cn(
                "casino-gold-btn text-3xl w-42 py-8 rounded-none rounded-tl-2xl",
                deskFilter === "ALL" && "casino-gold-active",
              )}
            >
              全部
            </Button>

            <Button
              onClick={() => setDeskFilter("BACCARAT")}
              variant={deskFilter === "BACCARAT" ? "default" : "secondary"}
              className={cn(
                "casino-gold-btn text-3xl w-42 py-8 rounded-none rounded-tl-2xl",
                deskFilter === "BACCARAT" && "casino-gold-active",
              )}
            >
              百家乐
            </Button>

            <Button
              onClick={() => setDeskFilter("LONGHU")}
              variant={deskFilter === "LONGHU" ? "default" : "secondary"}
              className={cn(
                "casino-gold-btn text-3xl w-42 py-8 rounded-none rounded-tl-2xl",
                deskFilter === "LONGHU" && "casino-gold-active",
              )}
            >
              龙虎
            </Button>
          </div>
        </div>

        <CoinBoard
          selectedCoin={selectedCoin}
          setSelectedCoin={setSelectedCoin}
          amount={amount}
          setAmount={setAmount}
        />
      </div>
    </div>
  );
};

export default Index;
