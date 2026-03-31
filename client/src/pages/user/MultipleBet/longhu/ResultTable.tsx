import { Desk, Game } from "@/types";
import React, { useEffect, useState } from "react";
import { BigRoad } from "@/components/roadmaps/BigRoad";
import { SecondBigRoad } from "@/components/roadmaps/SecondBigRoad";
import BigEyeRoad from "@/components/roadmaps/BigEyeRoad";
import SmallRoad from "@/components/roadmaps/SmallRoad";
import CockroachRoad from "@/components/roadmaps/CockroachRoad";
import { Result } from "@/types/Result";
import { getSocket } from "@/lib/socket";
import { useGameContext } from "@/contexts/GameContext";
import { GoodRoadStrip } from "@/components/shared/GoodRoadStrip";
import GuessNextBetsButtons from "@/components/shared/multiple-bets/GuessNextBetsButtons";
import { getLastRoundStatus } from "@/api/user";
import BettingBoard from "./BettingBoard";

type ResultTableProps = {
  desk: Desk;
  game: Game;
  selectedCoin: { value: number } | null;
  amount: string;
  setAmount: (v: string) => void;
};

const ResultTable: React.FC<ResultTableProps> = ({
  desk,
  game,
  selectedCoin,
  amount,
  setAmount,
}) => {
  const socket = getSocket();
  const { goodRoads } = useGameContext();
  const [status, setStatus] = useState<string | null>(null);
  const [deskTimer, setDeskTimer] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const deskGoodRoad = goodRoads.find((r) => r.deskId === desk.id);

  useEffect(() => {
    fetchLastRoundStatus();
    setResults(desk.results);
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

  useEffect(() => {
    if (!desk.id) return;

    const timerEvent = `desk:${desk.id}:updateTimer`;
    const statusEvent = `desk:${desk.id}:updateStatus`;

    const handleTimer = (t: number) => {
      setDeskTimer(t);
    };

    const handleStatus = (s: string) => {
      setStatus(s);
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

  const dragonCount =
    results?.filter((r) => r.key.split("|").includes("dragon") && !r.isGuess)
      .length || 0;

  const tigerCount =
    results?.filter((r) => r.key.split("|").includes("tiger") && !r.isGuess)
      .length || 0;

  const longhuTieCount =
    results?.filter((r) => r.key.split("|").includes("tie") && !r.isGuess)
      .length || 0;

  const longhuTotalCount = dragonCount + tigerCount + longhuTieCount;

  return (
    <div className="w-full">
      <div className="absolute text-white text-xl bg-black/80 px-3 top-[-190px] left-5">
        {statusName()}
      </div>

      <BettingBoard
        desk={desk}
        game={game}
        selectedCoin={selectedCoin}
        amount={amount}
        setAmount={setAmount}
        status={status}
        lastRound={desk.last_round}
      />

      <div className="flex flex-row text-white text-center p-1 font-bold w-full">
        <div className="flex items-center gap-2 justify-between px-4">
          <span className="text-red-500">龙</span>
          <span className="text-white">{dragonCount}</span>
        </div>
        <div className="flex items-center gap-2 justify-between px-4">
          <span className="text-sky-300">虎</span>
          <span className="text-white">{tigerCount}</span>
        </div>
        <div className="flex items-center gap-2 justify-between px-4">
          <span className="text-green-500">和</span>
          <span className="text-white">{longhuTieCount}</span>
        </div>
        <div className="flex items-center gap-2 px-4 ml-auto">
          <span className="text-white">总数</span>
          <span className="text-white">{longhuTotalCount}</span>
        </div>
      </div>

      <div className="h-[170px] overflow-hidden m-2 border-1">
        <div className="flex w-full h-full bg-white overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 relative">
            <div className="overflow-hidden">
              <BigRoad results={results} page="multiple" />
            </div>
            <div className="flex overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <BigEyeRoad results={results} page="multiple" />
              </div>
              <div className="flex-1 overflow-hidden">
                <SecondBigRoad results={results} page="multiple" />
              </div>
            </div>
            <div className="flex overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <SmallRoad results={results} page="multiple" />
              </div>
              <div className="flex-1 overflow-hidden">
                <CockroachRoad results={results} page="multiple" />
              </div>
            </div>
            {deskGoodRoad && (
              <GoodRoadStrip patternType={deskGoodRoad.patternType} />
            )}
          </div>
        </div>
      </div>
      <GuessNextBetsButtons
        gameType={desk.game?.type || ""}
        setResults={setResults}
      />
    </div>
  );
};

export default ResultTable;
