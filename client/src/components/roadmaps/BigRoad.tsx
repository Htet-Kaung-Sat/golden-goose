import { useTableScroll } from "@/hooks/useTableScroll";
import { cn } from "@/lib/utils";
import { Result } from "@/types/Result";

type BigRoadProps = {
  results: Result[];
  page: "home" | "game" | "multiple" | "side";
};

export type BigRoadCell = {
  main: string;
  tieCount: number;
  isGuess?: boolean;
};

export const BigRoad: React.FC<BigRoadProps> = ({ results, page }) => {
  const scrollRef = useTableScroll(results);

  const pageConfig = (() => {
    switch (page) {
      case "home":
        return {
          cellHeight: "h-[16px]",
          colWidth: "16px",
          maxColUsed: 25,
          circleSize: "w-[9px] h-[9px]",
          ringSize: "ring-2",
          tieSize: "w-4 h-[4px]",
        };
      case "game":
        return {
          cellHeight: "h-[32px]",
          colWidth: "32px",
          maxColUsed: 15,
          circleSize: "w-[20px] h-[20px]",
          ringSize: "ring-4",
          tieSize: "w-8 h-[8px]",
        };
      case "multiple":
        return {
          cellHeight: "h-[14px]",
          colWidth: "14px",
          maxColUsed: 25,
          circleSize: "w-2 h-2",
          ringSize: "ring-2",
          tieSize: "w-4 h-[4px]",
        };
      case "side":
        return {
          cellHeight: "h-[35px]",
          colWidth: "35px",
          maxColUsed: 14,
          circleSize: "w-5 h-5",
          ringSize: "ring-4",
          tieSize: "w-8 h-[8px]",
        };
    }
  })();

  const generateTable = () => {
    const getMainResult = (key: string) => {
      const parts = key.split("|");

      if (parts.includes("banker")) return "banker";

      if (parts.includes("player")) return "player";
      if (parts.includes("tiger")) return "tiger";
      if (parts.includes("dragon")) return "dragon";

      return "";
    };

    const getGroup = (main: string) => {
      if (["banker", "supertwoSix", "superthreeSix"].includes(main))
        return "banker-group";

      return main;
    };
    const getRingColor = (main: string) => {
      switch (main) {
        case "banker":
        case "dragon":
          return "ring-red-500";
        default:
          return "ring-blue-500";
      }
    };

    const grid: Record<string, BigRoadCell> = {};

    let lastPos = { col: 0, row: -1 };

    let prevGroup = "";

    let maxColUsed = pageConfig.maxColUsed;

    let isHorizontalMode = false;

    results.forEach((res) => {
      const key = res.key;

      const isTie = key.split("|").includes("tie");

      const main = getMainResult(key);

      const group = getGroup(main);

      if (isTie) {
        const lastCell = grid[`${lastPos.col}-${lastPos.row}`];

        if (lastCell) lastCell.tieCount++;

        return;
      }

      let nextCol: number;

      let nextRow: number;

      if (group !== prevGroup) {
        let searchCol = 0;

        while (grid[`${searchCol}-0`]) searchCol++;

        nextCol = searchCol;

        nextRow = 0;

        isHorizontalMode = false;
      } else {
        const rowBelow = lastPos.row + 1;

        if (rowBelow >= 6 || grid[`${lastPos.col}-${rowBelow}`]) {
          isHorizontalMode = true;
        }

        if (isHorizontalMode) {
          nextCol = lastPos.col + 1;
          nextRow = lastPos.row;
        } else {
          nextCol = lastPos.col;
          nextRow = rowBelow;
        }
      }

      grid[`${nextCol}-${nextRow}`] = {
        main,
        tieCount: 0,
        isGuess: res.isGuess,
      };

      lastPos = { col: nextCol, row: nextRow };

      prevGroup = group;

      if (nextCol > maxColUsed) maxColUsed = nextCol;
    });

    const colCount = maxColUsed + 1;

    const cells = [];

    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < colCount; col++) {
        const cell = grid[`${col}-${row}`];

        const ringColor = getRingColor(cell?.main);

        cells.push(
          <div
            key={`${row}-${col}`}
            className={cn(
              "flex items-center justify-center relative flex-none",
              "bg-white border-r border-b border-gray-500",
              pageConfig.cellHeight,
            )}
          >
            {cell && (
              <div className="relative flex items-center justify-center w-full h-full">
                <div
                  className={cn(
                    "rounded-full flex items-center justify-center overflow-hidden",
                    pageConfig.circleSize,
                    pageConfig.ringSize,
                    ringColor,
                    {
                      "animate-pulse-custom": cell.isGuess && cell.main !== "",
                    },
                  )}
                >
                  {cell.tieCount > 0 && (
                    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
                      <div
                        className={cn(
                          "bg-green-600 absolute rotate-[120deg]",
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
            )}
          </div>,
        );
      }
    }

    return { cells, colCount };
  };

  const { cells, colCount } = generateTable();

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide bg-white cursor-grab"
    >
      <div
        className="grid border-t border-l border-gray-500"
        style={{
          gridTemplateColumns: `repeat(${colCount}, ${pageConfig.colWidth})`,
        }}
      >
        {cells}
      </div>
    </div>
  );
};
