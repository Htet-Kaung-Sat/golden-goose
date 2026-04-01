import { cn } from "@/lib/utils";
import { NiuniuResult, WinCount } from "@/types";
import React from "react";

export type NiuNiuRoadProps = {
  niuResult: NiuniuResult[];
  winCount?: WinCount;
  page: "home" | "game";
};

const NiuNiuRoad: React.FC<NiuNiuRoadProps> = ({
  niuResult,
  winCount,
  page,
}) => {
  const player_rows = ["庄", "闲1", "闲2", "闲3"];
  const numOfCol = page === "home" ? 12 : 35;
  return (
    <>
      {page === "game" && (
        <div className="flex flex-col bg-[#3a2f1d] text-white text-center font-bold min-w-[155px]">
          <div className="flex items-center justify-between px-2 gap-5 py-1 border-none">
            <span className="text-sky-300 text-4xl">闲1</span>
            <span className="text-white text-4xl">{winCount?.player1}</span>
          </div>
          <div className="flex items-center justify-between px-2 gap-5 py-1 border-none">
            <span className="text-sky-300 text-4xl">闲2</span>
            <span className="text-white text-4xl">{winCount?.player2}</span>
          </div>
          <div className="flex items-center justify-between px-2 gap-5 py-1 border-none">
            <span className="text-sky-300 text-4xl">闲3</span>
            <span className="text-white text-4xl">{winCount?.player3}</span>
          </div>
          <div className="flex items-center justify-between px-2 gap-5 py-1 border-none">
            <span className="text-white text-4xl">总数</span>
            <span className="text-white text-4xl">
              {(winCount?.player1 ?? 0) +
                (winCount?.player2 ?? 0) +
                (winCount?.player3 ?? 0)}
            </span>
          </div>
        </div>
      )}

      <div className="w-full">
        <div
          className="grid gap-[1px] bg-gray-400 w-full"
          style={{
            gridTemplateColumns: `48px repeat(${numOfCol}, 48px)`,
            gridAutoRows: "min-content",
          }}
        >
          {player_rows.map((label, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <div
                className={cn(
                  "flex items-center justify-center bg-white font-bold aspect-square text-2xl",
                  rowIndex === 0 ? "text-red-500" : "text-[#01fae6]",
                )}
              >
                {label}
              </div>

              {(() => {
                const currentResults = niuResult?.length
                  ? niuResult.slice(-numOfCol)
                  : [];

                const emptyCount = Math.max(
                  0,
                  numOfCol - currentResults.length,
                );
                const filledResults = [
                  ...currentResults,
                  ...Array(emptyCount).fill(null),
                ];

                return filledResults.map((res, colIndex) => {
                  if (!res) {
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className="bg-white aspect-square"
                      />
                    );
                  }

                  let value: string | number | null = null;
                  let isWin = false;

                  if (rowIndex === 0) value = res.banker ?? null;
                  if (rowIndex === 1) {
                    value = res.player1 ?? null;
                    isWin = res.player1Win ?? false;
                  }
                  if (rowIndex === 2) {
                    value = res.player2 ?? null;
                    isWin = res.player2Win ?? false;
                  }
                  if (rowIndex === 3) {
                    value = res.player3 ?? null;
                    isWin = res.player3Win ?? false;
                  }

                  const circleColor =
                    rowIndex === 0 ? "bg-red-600" : "bg-blue-600";

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="relative flex items-center justify-center bg-white aspect-square"
                    >
                      {value !== null && value !== undefined && (
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-full text-white font-bold transition-all w-10 h-10 text-xl",
                            circleColor,
                          )}
                        >
                          {value}
                        </div>
                      )}

                      {isWin && (
                        <span className="absolute font-bold text-white-yellow-stroke text-md bottom-[-2px]">
                          win
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

export default NiuNiuRoad;
