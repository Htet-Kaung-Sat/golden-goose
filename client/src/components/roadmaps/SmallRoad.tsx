import { useTableScroll } from "@/hooks/useTableScroll";
import { cn } from "@/lib/utils";
import { Result } from "@/types/Result";
import { generateBigRoadWithNoLShape } from "@/utils/helper";

type SmallRoadProps = {
  results: Result[];
  page: "home" | "game" | "multiple";
};

export const SmallRoad: React.FC<SmallRoadProps> = ({ results, page }) => {
  const scrollRef = useTableScroll(results);

  const pageConfig = (() => {
    switch (page) {
      case "home":
        return {
          cellHeight: "h-[16px]",
          colWidth: "16px",
          maxColUsed: 13,
          circleSize: "w-[7px] h-[7px]",
        };
      case "game":
        return {
          cellHeight: "h-[32px]",
          colWidth: "32px",
          maxColUsed: 8,
          circleSize: "w-[14px] h-[14px]",
        };
      case "multiple":
        return {
          cellHeight: "h-[14px]",
          colWidth: "14px",
          maxColUsed: 13,
          circleSize: "w-[6px] h-[6px]",
        };
    }
  })();

  const generateSmallRoad = () => {
    const bigRoad = generateBigRoadWithNoLShape(results);

    const nonTieResults = results.filter(
      (res) => !res.key.split("|").includes("tie"),
    );

    const columns: Array<Array<{ row: number; main: string }>> = [];
    let maxCol = 0;

    Object.keys(bigRoad).forEach((key) => {
      const [col] = key.split("-").map(Number);
      if (col > maxCol) maxCol = col;
    });

    for (let col = 0; col <= maxCol; col++) {
      const column: Array<{ row: number; main: string }> = [];
      let row = 0;
      while (bigRoad[`${col}-${row}`]) {
        const cell = bigRoad[`${col}-${row}`];
        column.push({ row, main: cell.main });
        row++;
      }
      if (column.length > 0) {
        columns.push(column);
      }
    }

    if (columns.length < 3) return { grid: {}, maxColUsed: 0 };

    const smallRoadGrid: Record<
      string,
      { color: "red" | "blue"; isGuess?: boolean }
    > = {};
    let lastPos = { col: 0, row: -1, subCol: -1 };
    let prevColor: "red" | "blue" | null = null;
    let isHorizontalMode = false;

    let startColIdx = 2;
    let startEntryIdx = 1;

    if (columns.length >= 3 && columns[2].length === 1) {
      startColIdx = 3;
      startEntryIdx = 0;
    }

    if (startColIdx >= columns.length) {
      return { grid: {}, maxColUsed: 0 };
    }

    let resultIndex = 0;
    for (let colIdx = 0; colIdx < startColIdx; colIdx++) {
      resultIndex += columns[colIdx].length;
    }
    resultIndex += startEntryIdx;

    for (let colIdx = startColIdx; colIdx < columns.length; colIdx++) {
      const startIdx = colIdx === startColIdx ? startEntryIdx : 0;

      for (
        let entryIdx = startIdx;
        entryIdx < columns[colIdx].length;
        entryIdx++
      ) {
        const isNewColumn = entryIdx === 0;
        let isRed = false;

        if (isNewColumn) {
          const currentColDepth = columns[colIdx - 1].length;
          const previousColDepth = columns[colIdx - 3].length;
          isRed = currentColDepth === previousColDepth;
        } else {
          const currentRow = columns[colIdx][entryIdx].row;
          const leftTwoCol = columns[colIdx - 2];

          const leftTwoAboveExists = leftTwoCol.some(
            (c) => c.row === currentRow - 1,
          );
          const leftTwoExists = leftTwoCol.some((c) => c.row === currentRow);

          isRed = leftTwoAboveExists === leftTwoExists;
        }

        const color: "red" | "blue" = isRed ? "red" : "blue";

        const currentResult = nonTieResults[resultIndex];
        const isGuess = currentResult?.isGuess || false;

        resultIndex++;

        let nextCol: number;
        let nextRow: number;
        let nextSubCol: number;

        if (prevColor === null || color !== prevColor) {
          let searchCol = 0;
          let searchSubCol = 0;
          while (smallRoadGrid[`${searchCol}-0-${searchSubCol}`]) {
            searchSubCol++;
            if (searchSubCol >= 2) {
              searchSubCol = 0;
              searchCol++;
            }
          }
          nextCol = searchCol;
          nextRow = 0;
          nextSubCol = searchSubCol;
          isHorizontalMode = false;
        } else {
          const rowBelow = lastPos.row + 1;

          if (
            rowBelow >= 6 ||
            smallRoadGrid[`${lastPos.col}-${rowBelow}-${lastPos.subCol}`]
          ) {
            isHorizontalMode = true;
          }

          if (isHorizontalMode) {
            let newSubCol = lastPos.subCol + 1;
            let newCol = lastPos.col;

            if (newSubCol >= 2) {
              newSubCol = 0;
              newCol++;
            }

            nextCol = newCol;
            nextRow = lastPos.row;
            nextSubCol = newSubCol;
          } else {
            nextCol = lastPos.col;
            nextRow = rowBelow;
            nextSubCol = lastPos.subCol;
          }
        }

        smallRoadGrid[`${nextCol}-${nextRow}-${nextSubCol}`] = {
          color,
          isGuess,
        };
        lastPos = { col: nextCol, row: nextRow, subCol: nextSubCol };
        prevColor = color;
      }
    }

    let absoluteMaxCol = 0;
    Object.keys(smallRoadGrid).forEach((key) => {
      const [col] = key.split("-").map(Number);
      if (col > absoluteMaxCol) absoluteMaxCol = col;
    });

    return { grid: smallRoadGrid, maxColUsed: absoluteMaxCol };
  };

  const { grid, maxColUsed } = generateSmallRoad();
  const colCount = Math.max(maxColUsed + 1, pageConfig.maxColUsed);

  const cells = [];
  for (let visualRow = 0; visualRow < 3; visualRow++) {
    for (let visualCol = 0; visualCol < colCount; visualCol++) {
      const logicalRow1 = visualRow * 2;
      const logicalRow2 = visualRow * 2 + 1;

      const topLeft = grid[`${visualCol}-${logicalRow1}-0`];
      const topRight = grid[`${visualCol}-${logicalRow1}-1`];
      const bottomLeft = grid[`${visualCol}-${logicalRow2}-0`];
      const bottomRight = grid[`${visualCol}-${logicalRow2}-1`];

      cells.push(
        <div
          key={`${visualRow}-${visualCol}`}
          className={cn(
            "flex flex-col relative flex-none",
            "bg-white border-r border-b border-gray-500",
            pageConfig.cellHeight,
          )}
        >
          {/* Top row */}
          <div className="flex-1 flex">
            {/* Top-left */}
            <div className="flex-1 flex items-center justify-center">
              {topLeft && (
                <div
                  className={cn(
                    "rounded-full",
                    {
                      "animate-pulse-custom": topLeft.isGuess,
                    },
                    pageConfig.circleSize,
                    topLeft.color === "red" ? "bg-red-500" : "bg-blue-500",
                  )}
                />
              )}
            </div>
            {/* Top-right */}
            <div className="flex-1 flex items-center justify-center">
              {topRight && (
                <div
                  className={cn(
                    "rounded-full",
                    {
                      "animate-pulse-custom": topRight.isGuess,
                    },
                    pageConfig.circleSize,
                    topRight.color === "red" ? "bg-red-500" : "bg-blue-500",
                  )}
                />
              )}
            </div>
          </div>
          {/* Bottom row */}
          <div className="flex-1 flex">
            {/* Bottom-left */}
            <div className="flex-1 flex items-center justify-center">
              {bottomLeft && (
                <div
                  className={cn(
                    "rounded-full",
                    {
                      "animate-pulse-custom": bottomLeft.isGuess,
                    },
                    pageConfig.circleSize,
                    bottomLeft.color === "red" ? "bg-red-500" : "bg-blue-500",
                  )}
                />
              )}
            </div>
            {/* Bottom-right */}
            <div className="flex-1 flex items-center justify-center">
              {bottomRight && (
                <div
                  className={cn(
                    "rounded-full",
                    {
                      "animate-pulse-custom": bottomRight.isGuess,
                    },
                    pageConfig.circleSize,
                    bottomRight.color === "red" ? "bg-red-500" : "bg-blue-500",
                  )}
                />
              )}
            </div>
          </div>
        </div>,
      );
    }
  }

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

export default SmallRoad;
