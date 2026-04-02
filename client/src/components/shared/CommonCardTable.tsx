import { useGameContext } from "@/contexts/GameContext";
import { getSocket } from "@/lib/socket";
import { Desk, NiuniuResult, WinCount } from "@/types";
import React, { useEffect, useState } from "react";
import { BigRoadColumn, GoodRoadNotification } from "@/utils/goodRoad";
import { GoodRoadStrip } from "@/components/shared/GoodRoadStrip";
import { cn } from "@/lib/utils";
import { CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { clearPendingBetsForDesk } from "@/utils/helper";
import { Result } from "@/types/Result";
import { BigRoad } from "@/components/roadmaps/BigRoad";
import MarkerRoad from "@/components/roadmaps/MarkerRoad";
import BigEyeRoad from "@/components/roadmaps/BigEyeRoad";
import SmallRoad from "@/components/roadmaps/SmallRoad";
import CockroachRoad from "@/components/roadmaps/CockroachRoad";
import NiuniuRoad from "@/components/roadmaps/NiuniuRoad";
import { SecondBigRoad } from "../roadmaps/SecondBigRoad";
import GuessNextBetsButtons from "./multiple-bets/GuessNextBetsButtons";
import { getLastRoundStatus, getNiuniuResultsByDesk } from "@/api/user";

interface DeskCardTablesProps {
  desk: Desk;
  compact?: boolean;
  forHome?: boolean;
}

export const DeskCardTables: React.FC<DeskCardTablesProps> = ({
  desk,
  compact,
}) => {
  const [results, setResults] = useState<Result[]>([]);
  const [niuniuResults, setNiuniuResults] = useState<NiuniuResult[]>([]);
  const [winCount, setWinCount] = useState<WinCount>();
  const { triggerRefresh, user, setUser, goodRoads } = useGameContext();
  const [deskTimer, setDeskTimer] = useState(0);
  const [status, setStatus] = useState<string>("active");
  const socket = getSocket();

  const deskGoodRoad = goodRoads.find((r) => r.deskId === desk.id);

  useEffect(() => {
    setResults(desk.results);
  }, [desk]);

  useEffect(() => {
    if (!desk.id) return;

    const handleFinishSession = () => {
      triggerRefresh();

      fetchLastRoundStatus();
      if (desk.game?.type === "NIUNIU") fetchNiuniuResults();
    };

    socket.on(`desk:${desk.id}:finish-session`, handleFinishSession);

    return () => {
      socket.off(`desk:${desk.id}:finish-session`, handleFinishSession);
    };
  }, [desk.id]);

  useEffect(() => {
    if (!desk.id) return;

    const timerEvent = `desk:${desk.id}:updateTimer`;
    const statusEvent = `desk:${desk.id}:updateStatus`;

    const handleTimer = (t: number) => {
      setDeskTimer(t);
    };

    const handleStatus = (s: string) => {
      setStatus(s);
      if (s !== "betting" && user) {
        clearPendingBetsForDesk(
          desk.id,
          desk.last_round?.id || 0,
          user,
          setUser,
          desk.game?.type || "",
        );
      }
      if (s === "finished") {
        triggerRefresh();
        if (desk.game?.type === "NIUNIU") fetchNiuniuResults();
      }
    };

    socket.on(timerEvent, handleTimer);
    socket.on(statusEvent, handleStatus);

    return () => {
      socket.off(timerEvent, handleTimer);
      socket.off(statusEvent, handleStatus);
    };
  }, [desk.id]);

  const statusName = () => {
    if (status === "betting") return deskTimer;
    if (status === "dealing") return "开牌";
    if (status === "finished") return "派彩";
    if (status === "active") return "派彩";
  };

  useEffect(() => {
    fetchLastRoundStatus();
    if (desk.game?.type === "NIUNIU") fetchNiuniuResults();
  }, [desk.id]);

  const fetchLastRoundStatus = async () => {
    if (!desk.desk_no) return;
    try {
      const result = await getLastRoundStatus(desk.id);
      setStatus(result.data.lastRound.status);
    } catch (error) {
      console.error("Error fetching last round status", error);
    }
  };

  const fetchNiuniuResults = async () => {
    if (!desk.id) return;
    try {
      const result = await getNiuniuResultsByDesk(desk.id);
      setNiuniuResults(result.data.niuniuResults || []);
      setWinCount(result.data.winCount || null);
    } catch (err) {
      console.error("Failed to fetch niuniu results:", err);
    }
  };

  const bankerCount = results.filter(
    (r) => r.key.split("|").includes("banker") && !r.isGuess,
  ).length;
  const playerCount = results.filter(
    (r) => r.key.split("|").includes("player") && !r.isGuess,
  ).length;
  const tieCount = results.filter(
    (r) => r.key.split("|").includes("tie") && !r.isGuess,
  ).length;
  const totalCount = bankerCount + playerCount + tieCount;

  const dragonCount = results.filter(
    (r) => r.key.split("|").includes("dragon") && !r.isGuess,
  ).length;

  const tigerCount = results.filter(
    (r) => r.key.split("|").includes("tiger") && !r.isGuess,
  ).length;

  const longhuTieCount = results.filter(
    (r) => r.key.split("|").includes("tie") && !r.isGuess,
  ).length;

  const longhuTotalCount = dragonCount + tigerCount + longhuTieCount;

  if (compact) {
    if (desk.game?.type === "NIUNIU") {
      return (
        <>
          <CardHeader className="flex flex-row justify-between items-center py-1 px-4">
            <CardTitle className="text-white text-3xl font-bold">
              {desk.name}
            </CardTitle>
            <div className="bg-black text-white text-3xl px-5 py-1 rounded border border-gray-700">
              {statusName()}
            </div>
          </CardHeader>
          <CardContent className="px-2 overflow-hidden">
            <div className="flex w-full h-full bg-white overflow-hidden">
              <NiuniuRoad
                niuResult={niuniuResults}
                winCount={winCount}
                page="home"
              />
            </div>
          </CardContent>
          <CardFooter className="py-2 p-0">
            <CardFooterStats winCount={winCount} game_type={desk.game?.type} />
          </CardFooter>
        </>
      );
    }
    return (
      <>
        <CardHeader className="flex flex-row justify-between items-center py-1 px-4">
          <CardTitle className="text-white text-3xl font-bold">
            {desk.name}
          </CardTitle>
          <div className="bg-black text-white text-3xl px-5 py-1 rounded border border-gray-700">
            {statusName()}
          </div>
        </CardHeader>
        <CardContent className="overflow-hidden mr-5 ml-5 relative">
          <div className="flex w-full h-full bg-white overflow-hidden">
            <div className="flex-none overflow-hidden max-w-[198px]">
              <MarkerRoad results={results} page="home" />
            </div>
            <div className="flex-1 flex flex-col min-w-0 relative">
              <div className="overflow-hidden">
                <BigRoad results={results} page="home" />
              </div>
              <div className="overflow-hidden">
                <BigEyeRoad results={results} page="home" />
              </div>
              <div className="flex overflow-hidden">
                <div className="overflow-hidden">
                  <SmallRoad results={results} page="home" />
                </div>
                <div className="overflow-hidden">
                  <CockroachRoad results={results} page="home" />
                </div>
              </div>
              {deskGoodRoad && (
                <GoodRoadStrip patternType={deskGoodRoad.patternType} />
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="py-2 p-0">
          <CardFooterStats results={results} game_type={desk.game?.type} />
        </CardFooter>
      </>
    );
  }

  if (desk.game?.type === "NIUNIU") {
    return (
      <NiuniuRoad niuResult={niuniuResults} winCount={winCount} page="game" />
    );
  }
  return (
    <CardContent className="p-0">
      <div className="flex w-full overflow-hidden">
        <div className="flex w-full bg-white border-0 overflow-hidden">
          {desk.game?.type === "LONGHU" ? (
            <StatsDisplay
              bankerCount={dragonCount}
              playerCount={tigerCount}
              tieCount={longhuTieCount}
              totalCount={longhuTotalCount}
              game="LONGHU"
            />
          ) : (
            <StatsDisplay
              bankerCount={bankerCount}
              playerCount={playerCount}
              tieCount={tieCount}
              totalCount={totalCount}
              game="BACCARAT"
            />
          )}
          <div className="flex-none max-w-[258px] overflow-hidden">
            <MarkerRoad results={results} page="game" />
          </div>
          <div className="flex-none max-w-[513px] overflow-hidden">
            <BigRoad results={results} page="game" />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden max-w-[255px]">
            <div className="h-1/2 overflow-hidden">
              <BigEyeRoad results={results} page="game" />
            </div>
            <div className="h-1/2 overflow-hidden">
              <SmallRoad results={results} page="game" />
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden max-w-[258px]">
            <div className="h-1/2 overflow-hidden">
              <SecondBigRoad results={results} page="game" />
            </div>
            <div className="h-1/2 overflow-hidden">
              <CockroachRoad results={results} page="game" />
            </div>
          </div>
        </div>

        <GuessNextBetsButtons
          gameType={desk.game.type}
          setResults={setResults}
          isGamePlayer
        />

        <GoodRoadPanel />
      </div>
    </CardContent>
  );
};

const StatsDisplay: React.FC<{
  bankerCount: number;
  playerCount: number;
  tieCount: number;
  totalCount: number;
  winCount?: string;
  game: string;
}> = (props) => {
  if (props.game === "LONGHU") {
    return (
      <div className="flex flex-col bg-gray-900 text-white border-0 text-center font-bold text-4xl min-w-[200px] shrink-0">
        <div className="flex items-center justify-between px-2 py-1 border-none">
          <span className="text-red-500">龙</span>
          <span>{props.bankerCount}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 border-none">
          <span className="text-sky-300">虎</span>
          <span>{props.playerCount}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 border-none">
          <span className="text-green-500">和</span>
          <span>{props.tieCount}</span>
        </div>
        <div className="flex items-center justify-between px-2 py-1 border-none">
          <span>总数</span>
          <span>{props.totalCount}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col bg-gray-900 text-white border-0 text-center font-bold text-4xl min-w-[200px] shrink-0">
      <div className="flex items-center justify-between px-2 py-1 border-none">
        <span className="text-red-500">庄</span>
        <span>{props.bankerCount}</span>
      </div>
      <div className="flex items-center justify-between px-2 py-1 border-none">
        <span className="text-sky-300">闲</span>
        <span>{props.playerCount}</span>
      </div>
      <div className="flex items-center justify-between px-2 py-1 border-none">
        <span className="text-green-500">和</span>
        <span>{props.tieCount}</span>
      </div>
      <div className="flex items-center justify-between px-2 py-1 border-none">
        <span>总数</span>
        <span>{props.totalCount}</span>
      </div>
    </div>
  );
};

const CardFooterStats: React.FC<{
  winCount?: WinCount;
  results?: Result[];
  game_type: string;
}> = ({ results, game_type, winCount }) => {
  if (game_type === "NIUNIU") {
    return (
      <div className="flex flex-row  bg-gray-900 text-white text-center font-bold text-xl w-full">
        <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
          <span className="text-[#01fae6] text-2xl">闲1</span>
          <span className="text-white text-xl">{winCount?.player1}</span>
        </div>
        <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
          <span className="text-[#01fae6] text-2xl">闲2</span>
          <span className="text-white text-xl">{winCount?.player2}</span>
        </div>
        <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
          <span className="text-[#01fae6] text-2xl">闲3</span>
          <span className="text-white text-xl">{winCount?.player3}</span>
        </div>
        <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
          <span className="text-white text-2xl">总数</span>
          <span className="text-white text-xl">
            {(winCount?.player1 ?? 0) +
              (winCount?.player2 ?? 0) +
              (winCount?.player3 ?? 0)}
          </span>
        </div>
      </div>
    );
  }

  if (game_type === "LONGHU") {
    //for longhu game
    const dragonCount =
      results?.filter((r) => r.key.split("|").includes("dragon")).length || 0;

    const tigerCount =
      results?.filter((r) => r.key.split("|").includes("tiger")).length || 0;

    const longhuTieCount =
      results?.filter((r) => r.key.split("|").includes("tie")).length || 0;

    const longhuTotalCount = dragonCount + tigerCount + longhuTieCount;

    return (
      <div className="flex flex-row bg-gray-900 text-white text-center font-bold text-xl w-full">
        <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
          <span className="text-red-500 text-2xl">龙</span>
          <span className="text-white text-xl">{dragonCount}</span>
        </div>
        <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
          <span className="text-sky-300 text-2xl">虎</span>
          <span className="text-white text-xl">{tigerCount}</span>
        </div>
        <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
          <span className="text-green-500 text-2xl">和</span>
          <span className="text-white text-xl">{longhuTieCount}</span>
        </div>
        <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
          <span className="text-white text-2xl">总数</span>
          <span className="text-white text-xl">{longhuTotalCount}</span>
        </div>
      </div>
    );
  }
  //for baccarat game
  const bankerCount =
    results?.filter((r) => r.key.split("|").includes("banker")).length || 0;
  const playerCount =
    results?.filter((r) => r.key.split("|").includes("player")).length || 0;
  const tieCount =
    results?.filter((r) => r.key.split("|").includes("tie")).length || 0;
  const totalCount = bankerCount + playerCount + tieCount;
  return (
    <div className="flex flex-row bg-gray-900 text-white text-center font-bold text-xl w-full">
      <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
        <span className="text-red-500 text-2xl">庄</span>
        <span className="text-white text-xl">{bankerCount}</span>
      </div>
      <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
        <span className="text-sky-300 text-2xl">闲</span>
        <span className="text-white text-xl">{playerCount}</span>
      </div>
      <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
        <span className="text-green-500 text-2xl">和</span>
        <span className="text-white text-xl">{tieCount}</span>
      </div>
      <div className="flex items-center gap-2 justify-between px-4 py-2 border-none">
        <span className="text-white text-2xl">总数</span>
        <span className="text-white text-xl">{totalCount}</span>
      </div>
    </div>
  );
};

const GAME_TYPE_LABELS: Record<string, string> = {
  BACCARAT: "百家樂",
  LONGHU: "龙虎斗",
};

const GoodRoadGrid: React.FC<{
  columns: BigRoadColumn[];
  patternKey?: string;
}> = ({ columns, patternKey }) => {
  const displayCols = columns.slice(0, 4);
  const maxRows = 4;
  const paddedCols: (BigRoadColumn | null)[] = [
    ...displayCols,
    ...Array(Math.max(0, 4 - displayCols.length)).fill(null),
  ];

  const useRedForAll =
    patternKey === "long-banker" || patternKey === "long-player";

  return (
    <div
      className="inline-grid border border-gray-500 border-r-0 border-b-0 mr-1 bg-amber-950 border-collapse"
      style={{
        gridTemplateColumns: `repeat(${paddedCols.length}, 14px)`,
        gridTemplateRows: `repeat(${maxRows}, 14px)`,
      }}
    >
      {Array.from({ length: maxRows }).map((_, rowIdx) =>
        paddedCols.map((col, colIdx) => (
          <div
            key={`${rowIdx}-${colIdx}`}
            className="w-[14px] h-[14px] flex items-center justify-center border-r border-b border-amber-100 border-collapse"
          >
            {col && rowIdx < col.count && (
              <div
                className={cn(
                  "w-[12px] h-[12px] rounded-full",
                  useRedForAll || colIdx === 0 || colIdx === 2
                    ? "bg-red-500"
                    : "bg-blue-500",
                )}
              />
            )}
          </div>
        )),
      )}
    </div>
  );
};

const STATUS_LABELS: Record<string, string> = {
  payment: "派彩",
  betting: "开牌",
};

const GoodRoadRow: React.FC<{ notification: GoodRoadNotification }> = ({
  notification,
}) => {
  const gameLabel =
    GAME_TYPE_LABELS[notification.gameType] || notification.gameType;
  const statusLabel = STATUS_LABELS[notification.deskStatus] || "派彩";

  return (
    <div className="flex items-center gap-5 bg-[#ffffff] px-3 mb-[2px]">
      <div className="min-w-[50px]">
        <span
          className="text-white text-2xl font-bold text-shadow-lg/40"
          style={{
            WebkitTextStroke: "1px black",
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div className="flex flex-col min-w-[80px]">
        <div className="flex gap-5">
          <span className="text-blue-600 text-2xl font-medium">
            {gameLabel}
          </span>
          <span className="text-black text-2xl font-medium">
            {notification.deskName}
          </span>
        </div>
        <span className="text-black text-2xl font-medium">
          {notification.patternType}
        </span>
      </div>
      <div className="ml-auto">
        <GoodRoadGrid
          columns={notification.columns}
          patternKey={notification.patternKey}
        />
      </div>
    </div>
  );
};

const GoodRoadPanel: React.FC = () => {
  const { goodRoads } = useGameContext();

  return (
    <div className="w-[465px] bg-gray-900 flex flex-col">
      <div className="text-white text-xl text-center border-b border-white/20 font-bold shrink-0">
        好路提醒
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[160px]">
        {goodRoads.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-lg">
            暂无好路
          </div>
        ) : (
          goodRoads.map((road, idx) => (
            <GoodRoadRow
              key={`${road.deskId}-${road.patternType}-${idx}`}
              notification={road}
            />
          ))
        )}
      </div>
    </div>
  );
};
