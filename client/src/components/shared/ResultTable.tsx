import React, { useEffect, useState } from "react";
import { CardContent, CardHeader, CardTitle } from "../ui/card";
import { getLastRoundStatus, getNiuniuResultsByDesk } from "@/api/user";
import { Result } from "@/types/Result";
import { getSocket } from "@/lib/socket";
import { useGameContext } from "@/contexts/GameContext";
import { BigRoad } from "@/components/roadmaps/BigRoad";
import NiuniuRoad from "@/components/roadmaps/NiuniuRoad";
import { GoodRoadStrip } from "@/components/shared/GoodRoadStrip";
import { Desk, NiuniuResult, WinCount } from "@/types";

type ResultTableProps = {
  desk: Desk;
};

export const ResultTable: React.FC<ResultTableProps> = ({ desk }) => {
  const socket = getSocket();
  const { triggerRefresh, goodRoads } = useGameContext();
  const [results, setResults] = useState<Result[]>([]);
  const deskGoodRoad = goodRoads.find((r) => r.deskId === desk.id);
  const [niuniuResults, setNiuniuResults] = useState<NiuniuResult[]>([]);
  const [winCount, setWinCount] = useState<WinCount>();
  const [status, setStatus] = useState<string>("active");
  const [deskTimer, setDeskTimer] = useState(0);

  const isNiuniu = desk.game?.type === "NIUNIU";

  useEffect(() => {
    setResults(desk.results);
    fetchLastRoundStatus();
    if (isNiuniu) fetchNiuniuResults();
  }, [desk]);

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
      setWinCount(result.data.winCount || undefined);
    } catch (err) {
      console.error("Failed to fetch niuniu results:", err);
    }
  };

  useEffect(() => {
    if (!desk.id) return;

    const handleFinishSession = () => {
      triggerRefresh();
      if (isNiuniu) fetchNiuniuResults();
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
      if (s === "finished") {
        triggerRefresh();
        if (isNiuniu) fetchNiuniuResults();
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

  return (
    <>
      <CardHeader className="flex flex-row justify-between items-center py-1 px-4">
        <CardTitle className="text-white text-3xl font-bold">
          {desk.name}
        </CardTitle>
        <div className="text-white text-3xl">{statusName()}</div>
      </CardHeader>
      <CardContent className="overflow-hidden me-0 m-3 relative">
        <div className="flex w-full bg-white overflow-hidden relative">
          {isNiuniu ? (
            <NiuniuRoad
              niuResult={niuniuResults}
              winCount={winCount}
              page="home"
            />
          ) : (
            <div className="flex-1 flex flex-col min-w-0 relative">
              <BigRoad results={results} page="side" />
              {deskGoodRoad && (
                <GoodRoadStrip patternType={deskGoodRoad.patternType} />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </>
  );
};

export default ResultTable;
