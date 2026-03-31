import { useTableScroll } from "@/hooks/useTableScroll";
import { cn } from "@/lib/utils";
import { Result } from "@/types/Result";
import { generateBigRoadWithNoLShape } from "@/utils/helper";

type CockroachRoadProps = {
  results: Result[];
  page: "home" | "game" | "multiple";
};

export const CockroachRoad: React.FC<CockroachRoadProps> = ({
  results,
  page,
}) => {
  const scrollRef = useTableScroll(results);
  const pageConfig = (() => {
    switch (page) {
      case "home":
        return {
          cellHeight: "h-[16px]",
          colWidth: "16px",
          maxColUsed: 13,
          slashWidth: "w-[8px]",
          slashHeight: "h-[2px]",
        };
      case "game":
        return {
          cellHeight: "h-[32px]",
          colWidth: "32px",
          maxColUsed: 8,
          slashWidth: "w-[14px]",
          slashHeight: "h-[5px]",
        };
      case "multiple":
        return {
          cellHeight: "h-[14px]",
          colWidth: "14px",
          maxColUsed: 13,
          slashWidth: "w-[7px]",
          slashHeight: "h-[2px]",
        };
    }
  })();

  const generateCockroachRoad = () => {
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

    if (columns.length < 4) return { grid: {}, maxColUsed: 0 };

    const cockroachRoadGrid: Record<
      string,
      { color: "red" | "blue"; isGuess?: boolean }
    > = {};
    let lastPos = { col: 0, row: -1, subCol: -1 };
    let prevColor: "red" | "blue" | null = null;
    let isHorizontalMode = false;

    let startColIdx = 3;
    let startEntryIdx = 1;

    if (columns.length >= 4 && columns[3].length === 1) {
      startColIdx = 4;
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
          const previousColDepth = columns[colIdx - 4].length;
          isRed = currentColDepth === previousColDepth;
        } else {
          const currentRow = columns[colIdx][entryIdx].row;
          const leftThreeCol = columns[colIdx - 3];

          const leftThreeAboveExists = leftThreeCol.some(
            (c) => c.row === currentRow - 1,
          );
          const leftThreeExists = leftThreeCol.some(
            (c) => c.row === currentRow,
          );

          isRed = leftThreeAboveExists === leftThreeExists;
        }

        const color: "red" | "blue" = isRed ? "red" : "blue";

        // Get the isGuess property from the corresponding result
        const currentResult = nonTieResults[resultIndex];
        const isGuess = currentResult?.isGuess || false;

        resultIndex++;

        let nextCol: number;
        let nextRow: number;
        let nextSubCol: number;

        if (prevColor === null || color !== prevColor) {
          let searchCol = 0;
          let searchSubCol = 0;
          while (cockroachRoadGrid[`${searchCol}-0-${searchSubCol}`]) {
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
            cockroachRoadGrid[`${lastPos.col}-${rowBelow}-${lastPos.subCol}`]
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
            // Move down
            nextCol = lastPos.col;
            nextRow = rowBelow;
            nextSubCol = lastPos.subCol;
          }
        }

        cockroachRoadGrid[`${nextCol}-${nextRow}-${nextSubCol}`] = {
          color,
          isGuess,
        };
        lastPos = { col: nextCol, row: nextRow, subCol: nextSubCol };
        prevColor = color;
      }
    }

    let absoluteMaxCol = 0;
    Object.keys(cockroachRoadGrid).forEach((key) => {
      const [col] = key.split("-").map(Number);
      if (col > absoluteMaxCol) absoluteMaxCol = col;
    });

    return { grid: cockroachRoadGrid, maxColUsed: absoluteMaxCol };
  };

  const { grid, maxColUsed } = generateCockroachRoad();
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
                    "-rotate-45",
                    {
                      "animate-pulse-custom": topLeft.isGuess,
                    },
                    pageConfig.slashWidth,
                    pageConfig.slashHeight,
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
                    "-rotate-45",
                    {
                      "animate-pulse-custom": topRight.isGuess,
                    },
                    pageConfig.slashWidth,
                    pageConfig.slashHeight,
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
                    "-rotate-45",
                    {
                      "animate-pulse-custom": bottomLeft.isGuess,
                    },
                    pageConfig.slashWidth,
                    pageConfig.slashHeight,
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
                    "-rotate-45",
                    {
                      "animate-pulse-custom": bottomRight.isGuess,
                    },
                    pageConfig.slashWidth,
                    pageConfig.slashHeight,
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

export default CockroachRoad;
