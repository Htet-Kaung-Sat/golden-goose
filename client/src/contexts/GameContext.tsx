import { Desk } from "@/types";
import { GameRound } from "@/types/GameRound";
import { User } from "@/types/User";
import { GoodRoadNotification } from "@/utils/goodRoad";
import React, { createContext, useContext, useState } from "react";

interface GameContextType {
  status: string | null;
  setStatus: (status: string) => void;
  statusDeskId: number | null;
  setStatusDeskId: (deskId: number | null) => void;
  betBalance: number;
  setBetBalance: (betBalance: number) => void;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  lastRound: GameRound | null;
  setLastRound: (lastRound: GameRound) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  multipleDesks: Desk[];
  setMultipleDesks: React.Dispatch<React.SetStateAction<Desk[]>>;
  goodRoads: GoodRoadNotification[];
  setGoodRoads: (roads: GoodRoadNotification[]) => void;
  amount: string;
  setAmount: (amount: string) => void;
  selectedCoin: { value: number } | null;
  setSelectedCoin: (coin: { value: number } | null) => void;
}

const GameContext = createContext<GameContextType>({
  status: "active",
  setStatus: () => {},
  statusDeskId: null,
  setStatusDeskId: () => {},
  betBalance: 0,
  setBetBalance: () => {},
  user: null,
  setUser: () => {},
  lastRound: null,
  setLastRound: () => {},
  refreshKey: 0,
  triggerRefresh: () => {},
  multipleDesks: [],
  setMultipleDesks: () => {},
  goodRoads: [],
  setGoodRoads: () => {},
  amount: "0",
  setAmount: () => {},
  selectedCoin: null,
  setSelectedCoin: () => {},
});

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<string>("active");
  const [statusDeskId, setStatusDeskId] = useState<number | null>(null);
  const [betBalance, setBetBalance] = useState<number>(0);
  const [user, setUser] = useState<User | null>(null);
  const [lastRound, setLastRound] = useState<GameRound | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [multipleDesks, setMultipleDesks] = useState<Desk[]>([]);
  const [goodRoads, setGoodRoads] = useState<GoodRoadNotification[]>([]);
  const [amount, setAmount] = useState<string>("0");
  const [selectedCoin, setSelectedCoin] = useState<{ value: number } | null>(null);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <GameContext.Provider
      value={{
        status,
        setStatus,
        statusDeskId,
        setStatusDeskId,
        betBalance,
        setBetBalance,
        user,
        setUser,
        lastRound,
        setLastRound,
        refreshKey,
        triggerRefresh,
        multipleDesks,
        setMultipleDesks,
        goodRoads,
        setGoodRoads,
        amount,
        setAmount,
        selectedCoin,
        setSelectedCoin,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => useContext(GameContext);
