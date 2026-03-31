import { BigRoadCell } from "@/components/roadmaps/BigRoad";
import { Result } from "@/types/Result";
import { User } from "@/types/User";
import React from "react";

const NIUNIU_DOUBLE_BET_KEYS = new Set([
  "banker1Double",
  "banker2Double",
  "banker3Double",
  "player1Double",
  "player2Double",
  "player3Double",
]);

export const getRateLimit = (user: User, gameId: number) => {
  const userRateLimit = user?.userRateLimits?.find(
    (r) => r.rateLimit.game_id === gameId,
  );
  return userRateLimit?.rateLimit;
};

export const getResultRateLimit = (
  user: User,
  gameId: number,
  resultId: number,
) => {
  const userRateLimit = user?.userRateLimits?.find(
    (r) => r.rateLimit.game_id === gameId,
  );
  const resultRateLimit = userRateLimit?.rateLimit.results.find(
    (r) => r.result_id === resultId,
  );
  return resultRateLimit;
};

export const clearPendingBetsForDesk = (
  deskId: number,
  LastRoundId: number,
  user: User,
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  gameType: string = "",
) => {
  const key = `pendingBets:${deskId}:${LastRoundId}`;

  const raw = localStorage.getItem(key);
  if (!raw) return;

  const saved = JSON.parse(raw) as Record<
    string,
    { id: number; amount: number; image: string }
  >;
  if (!saved) return;

  const pendingBets = Object.keys(saved).map((key) => ({
    amount:
      gameType === "NIUNIU" && key.includes("Double")
        ? saved[key].amount * 3
        : saved[key].amount,
  }));

  const totalPending = Object.values(pendingBets).reduce(
    (sum, b) => sum + b.amount,
    0,
  );

  if (user)
    setUser((prev) =>
      prev ? { ...prev, balance: (prev.balance ?? 0) + totalPending } : prev,
    );

  localStorage.removeItem(key);
};

export const getTotalPendingBetsAmount = (excludeKey?: string) => {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (!key.startsWith("pendingBets:")) continue;
      if (excludeKey && key === excludeKey) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const saved = JSON.parse(raw) as Record<
        string,
        { id: number; amount: number; image: string }
      >;
      if (!saved) continue;

      total += Object.keys(saved).reduce((sum, betKey) => {
        const amt = saved[betKey]?.amount ?? 0;
        return sum + (NIUNIU_DOUBLE_BET_KEYS.has(betKey) ? amt * 3 : amt);
      }, 0);
    }
    return total;
  } catch {
    return 0;
  }
};

export const generateBigRoadWithNoLShape = (results: Result[]) => {
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

  const grid: Record<string, BigRoadCell> = {};
  let lastPos = { col: 0, row: -1 };
  let prevGroup = "";

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
    } else {
      const rowBelow = lastPos.row + 1;
      nextCol = lastPos.col;
      nextRow = rowBelow;
    }

    grid[`${nextCol}-${nextRow}`] = { main, tieCount: 0 };
    lastPos = { col: nextCol, row: nextRow };
    prevGroup = group;
  });

  return grid;
};

export const isBetRestricted = (
  roundNo: number | undefined,
  betType: string,
): boolean => {
  const restrictedTypes = [
    "dragonSingle",
    "dragonDouble",
    "tigerDouble",
    "tigerSingle",
    "big",
    "anyPair",
    "small",
    "perfectPair",
  ];
  const isRestrictedType = restrictedTypes.includes(betType);
  const isAfterRound30 = roundNo !== undefined && roundNo > 30;

  return isAfterRound30 && isRestrictedType;
};

export const wait = (ms: number = 1000) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
