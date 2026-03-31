import { useTableScroll } from "@/hooks/useTableScroll";
import { cn } from "@/lib/utils";
import { Result } from "@/types/Result";
import { formatResultDisplay } from "@/utils/FormatResultDisplay";

type MarkerRoadProps = {
  results: Result[];
  page: "home" | "game";
};

const MarkerRoad: React.FC<MarkerRoadProps> = ({ results, page }) => {
  const scrollRef = useTableScroll(results);
  const displayCols = page === "home" ? 6 : 8;
  const totalDataCols = Math.ceil(results.length / 6);
  // Offset to show only the last N columns of data
  const startCol = Math.max(0, totalDataCols - displayCols);
  const cellSize = "h-[32px]";

  const getColorClass = (color: string, type: "bg" | "text" | "border") => {
    const colorMap: Record<string, Record<string, string>> = {
      red: { bg: "bg-red-600", text: "text-red-600", border: "border-red-600" },
      blue: {
        bg: "bg-blue-600",
        text: "text-blue-600",
        border: "border-blue-600",
      },
      green: {
        bg: "bg-green-600",
        text: "text-green-600",
        border: "border-green-600",
      },
    };
    return colorMap[color]?.[type] || "";
  };

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto overflow-y-hidden select-none scrollbar-hide h-full w-full"
    >
      <div
        className="first-table grid bg-gray-500 w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${displayCols}, 32px)`,
        }}
      >
        {Array.from({ length: 6 }).map((_, rowIndex) =>
          Array.from({ length: displayCols }).map((_, colIndex) => {
            const index = (startCol + colIndex) * 6 + rowIndex;
            const result = results[index];
            if (!result)
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(cellSize, "bg-white border border-gray-500")}
                />
              );

            const { displayName, color, isBankerPair, isPlayerPair } =
              formatResultDisplay(result);
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  cellSize,
                  "bg-white flex items-center justify-center border border-gray-500",
                )}
              >
                <div
                  className={cn(
                    "relative flex justify-center items-center rounded-full text-white w-7 h-7",
                    {
                      "animate-pulse-custom": result.isGuess,
                    },
                    getColorClass(color, "bg"),
                  )}
                >
                  {isBankerPair && (
                    <div className="absolute bg-red-600 rounded-full w-2 h-2 top-0 left-0 border border-white" />
                  )}
                  {isPlayerPair && (
                    <div className="absolute bg-blue-600 rounded-full w-2 h-2 bottom-0 right-0 border border-white" />
                  )}
                  <span className="text-md">{displayName}</span>
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
};

export default MarkerRoad;
