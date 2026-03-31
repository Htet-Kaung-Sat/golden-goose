import { useTableScroll } from "@/hooks/useTableScroll";
import { cn } from "@/lib/utils";
import { Result } from "@/types/Result";

type SecondBigRoadProps = {
  results: Result[];
  page: "home" | "game" | "multiple";
};

type BigRoadCell = {
  main: "banker" | "player" | "tiger" | "dragon" | "";
  tieCount: number;
  key: string;
  isGuess?: boolean;
};

export const SecondBigRoad: React.FC<SecondBigRoadProps> = ({
  results,
  page,
}) => {
  const scrollRef = useTableScroll(results);

  const pageConfig = (() => {
    switch (page) {
      case "home":
        return {
          cellHeight: "h-[14px]",
          colWidth: "14px",
          maxColUsed: 13,
          circleSize: "w-[9px] h-[9px]",
          ringSize: "ring-2",
          tieSize: "w-4 h-[4px]",
        };
      case "game":
        return {
          cellHeight: "h-[32px]",
          colWidth: "32px",
          maxColUsed: 8,
          circleSize: "w-[20px] h-[20px]",
          ringSize: "ring-4",
          tieSize: "w-8 h-[8px]",
        };
      case "multiple":
        return {
          cellHeight: "h-[14px]",
          colWidth: "14px",
          maxColUsed: 13,
          circleSize: "w-[9px] h-[9px]",
          ringSize: "ring-2",
          tieSize: "w-4 h-[4px]",
        };
    }
  })();

  const generateTable = () => {
    const getRingColor = (main: string) => {
      if (!main) return null;
      if (main === "banker" || main === "dragon") return "ring-red-600";
      if (main === "player" || main === "tiger") return "ring-blue-600";
      return null;
    };
    const compactResults: BigRoadCell[] = [];
    let lastRealIndex: number | null = null;
    results.forEach((res) => {
      const keys = res.key.split("|");

      let mainValue: "banker" | "player" | "tiger" | "dragon" | "" = "";

      if (
        keys.includes("banker") ||
        keys.includes("supertwoSix") ||
        keys.includes("superthreeSix")
      ) {
        mainValue = "banker";
      } else if (keys.includes("player")) {
        mainValue = "player";
      } else if (keys.includes("dragon")) {
        mainValue = "dragon";
      } else if (keys.includes("tiger")) {
        mainValue = "tiger";
      }

      if (keys.includes("tie")) {
        if (lastRealIndex !== null) compactResults[lastRealIndex].tieCount++;
        return;
      }

      compactResults.push({
        main: mainValue,
        tieCount: 0,
        key: res.key,
        isGuess: res.isGuess,
      });
      lastRealIndex = compactResults.length - 1;
    });

    const colCount = Math.max(
      pageConfig.maxColUsed,
      Math.ceil(compactResults.length / 3),
    );

    const cells = Array.from({ length: 3 }).map((_, rowIndex) =>
      Array.from({ length: colCount }).map((_, colIndex) => {
        const index = colIndex * 3 + rowIndex;
        const cell = compactResults[index];
        if (!cell)
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                "bg-white border-r border-b border-gray-500 flex-none",
                pageConfig.cellHeight,
              )}
            />
          );

        const ringColor = getRingColor(cell?.main);
        return (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={cn(
              "flex items-center justify-center relative flex-none",
              "bg-white border-r border-b border-gray-500",
              pageConfig.cellHeight,
            )}
          >
            <div
              className={cn(
                "rounded-full flex items-center justify-center overflow-hidden",
                {
                  "animate-pulse-custom": cell.isGuess && cell.main !== "",
                },
                ringColor,
                pageConfig.circleSize,
                pageConfig.ringSize,
              )}
            >
              {cell.tieCount > 0 && (
                <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                  <div
                    className={cn(
                      "bg-green-600 absolute rotate-[115deg]",
                      pageConfig.tieSize,
                    )}
                  />
                  <span className="relative text-black z-10 text-lg">
                    {cell.tieCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      }),
    );
    return { cells, colCount };
  };

  const { cells, colCount } = generateTable();

  return (
    <div
      ref={scrollRef}
      className="flex flex-col w-full h-full bg-white overflow-y-hidden overflow-x-auto scrollbar-hide cursor-grab"
    >
      <div
        className="grid border-t border-l border-gray-500 w-fit"
        style={{
          gridTemplateColumns: `repeat(${colCount}, ${pageConfig.colWidth})`,
        }}
      >
        {cells}
      </div>
    </div>
  );
};
