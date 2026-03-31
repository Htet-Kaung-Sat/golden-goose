import { useTableScroll } from "@/hooks/useTableScroll";
import { cn } from "@/lib/utils";
import { Result } from "@/types/Result";
import { generateBigRoadWithNoLShape } from "@/utils/helper";

type BigEyeRoadProps = {
  results: Result[];
  page: "home" | "game" | "multiple";
};

export const BigEyeRoad: React.FC<BigEyeRoadProps> = ({ results, page }) => {
  const scrollRef = useTableScroll(results);
  const pageConfig = (() => {
    switch (page) {
      case "home":
        return {
          cellHeight: "h-[16px]",
          colWidth: "16px",
          maxColUsed: 26,
          circleSize: "w-[5px] h-[5px]",
          ringSize: "ring-[1.5px]",
        };
      case "game":
        return {
          cellHeight: "h-[32px]",
          colWidth: "32px",
          maxColUsed: 8,
          circleSize: "w-[10px] h-[10px]",
          ringSize: "ring-[2px]",
        };
      case "multiple":
        return {
          cellHeight: "h-[14px]",
          colWidth: "14px",
          maxColUsed: 13,
          circleSize: "w-[4px] h-[4px]",
          ringSize: "ring-[1.5px]",
        };
    }
  })();

  const generateBigEyeRoad = () => {
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
      // Scan all rows, not just 0-5
      Object.keys(bigRoad).forEach((key) => {
        const [keyCol, keyRow] = key.split("-").map(Number);
        if (keyCol === col) {
          const cell = bigRoad[key];
          column.push({ row: keyRow, main: cell.main });
        }
      });

      column.sort((a, b) => a.row - b.row);

      if (column.length > 0) {
        columns.push(column);
      }
    }

    if (columns.length < 2) return { grid: {}, maxColUsed: 0, maxSubCol: 0 };

    const bigEyeGrid: Record<
      string,
      { color: "red" | "blue"; isGuess?: boolean }
    > = {};
    let lastPos = { col: 0, row: -1, subCol: -1 };
    let prevColor: "red" | "blue" | null = null;
    let isHorizontalMode = false;

    let startColIdx = 1;
    let startEntryIdx = 1;

    if (columns.length >= 2 && columns[1].length === 1) {
      startColIdx = 2;
      startEntryIdx = 0;
    }

    if (startColIdx >= columns.length) {
      return { grid: {}, maxColUsed: 0, maxSubCol: 0 };
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
          const previousColDepth = columns[colIdx - 2].length;
          isRed = currentColDepth === previousColDepth;
        } else {
          const currentRow = columns[colIdx][entryIdx].row;
          const leftCol = columns[colIdx - 1];

          const leftAboveExists = leftCol.some((c) => c.row === currentRow - 1);
          const leftExists = leftCol.some((c) => c.row === currentRow);

          isRed = leftAboveExists === leftExists;
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
          while (bigEyeGrid[`${searchCol}-0-${searchSubCol}`]) {
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
            bigEyeGrid[`${lastPos.col}-${rowBelow}-${lastPos.subCol}`]
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

        bigEyeGrid[`${nextCol}-${nextRow}-${nextSubCol}`] = { color, isGuess };
        lastPos = { col: nextCol, row: nextRow, subCol: nextSubCol };
        prevColor = color;
      }
    }

    let absoluteMaxCol = 0;
    Object.keys(bigEyeGrid).forEach((key) => {
      const [col] = key.split("-").map(Number);
      if (col > absoluteMaxCol) absoluteMaxCol = col;
    });

    return {
      grid: bigEyeGrid,
      maxColUsed: absoluteMaxCol,
      maxSubCol: lastPos.subCol,
    };
  };

  const { grid, maxColUsed } = generateBigEyeRoad();

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
                    pageConfig.ringSize,
                    topLeft.color === "red" ? "ring-red-500" : "ring-blue-500",
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
                    pageConfig.ringSize,
                    topRight.color === "red" ? "ring-red-500" : "ring-blue-500",
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
                    pageConfig.ringSize,
                    bottomLeft.color === "red"
                      ? "ring-red-500"
                      : "ring-blue-500",
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
                    pageConfig.ringSize,
                    bottomRight.color === "red"
                      ? "ring-red-500"
                      : "ring-blue-500",
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

export default BigEyeRoad;
