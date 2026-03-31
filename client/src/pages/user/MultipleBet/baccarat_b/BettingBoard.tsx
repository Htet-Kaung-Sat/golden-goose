import { cancelBetResult, createBetResult, getConfirmedBets } from "@/api/user";
import BettingBoardItemWrapper from "@/components/shared/betting-board/BettingBoardItemWrapper";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useGameContext } from "@/contexts/GameContext";
import { useRoundResult } from "@/hooks/useRoundResult";
import { cn } from "@/lib/utils";
import { ConfirmedBets, Desk, Game } from "@/types";
import { GameRound } from "@/types/GameRound";
import { User } from "@/types/User";
import { getNearestCoin } from "@/utils/coinUtils";
import {
  clearPendingBetsForDesk,
  getTotalPendingBetsAmount,
  getResultRateLimit,
} from "@/utils/helper";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

type BettingBoardProps = {
  desk: Desk;
  game: Game;
  selectedCoin: { value: number } | null;
  amount: string;
  setAmount: (v: string) => void;
  status: string | null;
  lastRound?: GameRound;
};

const BettingBoard: React.FC<BettingBoardProps> = ({
  desk,
  game,
  selectedCoin,
  amount,
  setAmount,
  status,
  lastRound,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [pendingBets, setPendingBets] = useState<
    Record<string, { id: number; amount: number; image: string }>
  >({});
  const [confirmedBets, setConfirmedBets] = useState<ConfirmedBets>({});
  const { user, setUser, triggerRefresh } = useGameContext();

  const { changeResult, winners, netAmount } = useRoundResult({
    deskId: desk.id,
    lastRoundId: desk.last_round?.id,
    userId: user?.id,
    triggerCard: null,
    pollWhen: status === "dealing", // only poll when dealing
    onResult: () => {
      triggerRefresh();
      setPendingBets({});
      setConfirmedBets({});
      setAmount("0");
    },
  });

  const hasPendingBets = Object.keys(pendingBets).length > 0;
  const hasConfirmedBets = Object.keys(confirmedBets).length > 0;

  const topRow = game.results.filter(
    (r) =>
      r.baccarat_type === "B" && ["player", "tie", "banker"].includes(r.key),
  );

  const bottomRow = game.results.filter(
    (r) =>
      r.baccarat_type === "B" && ["playerPair", "bankerPair"].includes(r.key),
  );

  useEffect(() => {
    if (status === null) return;
    if (status !== "betting") {
      if (!user || !lastRound) return;
      clearPendingBetsForDesk(desk.id, lastRound.id, user, setUser);
      setPendingBets({});
    }
  }, [status]);

  useEffect(() => {
    fetchConfirmedBets();
  }, [lastRound]);

  const fetchConfirmedBets = async () => {
    if (!lastRound) return;
    try {
      const result = await getConfirmedBets(lastRound.id);
      if (result.data.confirmedBets)
        setConfirmedBets(result.data.confirmedBets);
    } catch (err) {
      console.error("Failed to fetch confirmed bets:", err);
    }
  };

  const handleBetClick = (result_id: number, key: string) => {
    if (!user) return;
    if (status !== "betting") return setErrorMessage("非下注时间内");
    const numericAmount = parseInt(amount || "0");
    if (numericAmount === 0 && !selectedCoin)
      return setErrorMessage("尚未选择筹码");

    const betAmount =
      numericAmount > 0 ? numericAmount : selectedCoin?.value || 0;
    const newAmountForKey =
      (pendingBets[key]?.amount || 0) +
      (confirmedBets[key]?.amount || 0) +
      betAmount;
    const displayImage = getNearestCoin(newAmountForKey).image;

    const newPending = {
      ...pendingBets,
      [key]: {
        id: result_id,
        amount: (pendingBets[key]?.amount || 0) + betAmount,
        image: displayImage,
      },
    };

    const balance = user?.balance || 0;

    if (betAmount > balance) {
      setErrorMessage("余额不足");
      return;
    }

    const resultRateLimit = getResultRateLimit(user, desk.game_id, result_id);
    if (!resultRateLimit) return;

    if (
      newAmountForKey < resultRateLimit.min_bet ||
      newAmountForKey > resultRateLimit.max_bet
    ) {
      setErrorMessage(`下注金额低于限额`);
      return;
    }

    if (user && user.balance != null)
      setUser({ ...user, balance: user.balance - betAmount });

    setPendingBets(newPending);

    localStorage.setItem(
      `pendingBets:${desk.id}:${lastRound?.id}`,
      JSON.stringify(newPending),
    );
  };

  useEffect(() => {
    if (status !== "betting") return;
    if (!desk?.id || !lastRound?.id) return;

    const key = `pendingBets:${desk.id}:${lastRound.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Record<
        string,
        { id: number; amount: number; image: string }
      >;
      if (!saved) return;
      setPendingBets(saved);
    } catch (err) {
      console.error("Failed to parse pending bets:", err);
    }
  }, [status, desk?.id, lastRound?.id]);

  const handleCancel = () => {
    if (!user || !lastRound) return;
    setPendingBets({});
    clearPendingBetsForDesk(desk.id, lastRound.id, user, setUser);
  };

  const handleConfirm = async () => {
    if (!hasPendingBets || !lastRound) return;
    setConfirmMessage("pending");

    try {
      const betArray = Object.keys(pendingBets).map((key) => ({
        result_id: pendingBets[key].id,
        amount: pendingBets[key].amount,
        image: pendingBets[key].image,
      }));

      const result = await createBetResult({
        last_round: lastRound.id,
        bets: betArray,
      });

      if (result.success) {
        const currentDeskKey = `pendingBets:${desk.id}:${lastRound.id}`;
        const otherDesksPendingTotal =
          getTotalPendingBetsAmount(currentDeskKey);
        setUser((prev: User | null) =>
          prev
            ? {
                ...prev,
                balance:
                  (result.data.remainingBalance ?? 0) - otherDesksPendingTotal,
              }
            : prev,
        );
        setConfirmedBets(result.data.confirmedBets);
        setPendingBets({});
        localStorage.removeItem(`pendingBets:${desk.id}:${lastRound.id}`);
        setConfirmMessage("success");
      }
    } catch (err) {
      console.error("Failed to confirm bets:", err);
      setErrorMessage("投注失败");
      setConfirmMessage(null);
    }
  };

  const handleRemove = async () => {
    if (!lastRound) return;

    setConfirmMessage("pending");

    try {
      const result = await cancelBetResult({
        last_round: lastRound.id,
      });

      if (result.success) {
        const totalConfirmBet = Object.values(confirmedBets).reduce(
          (sum, b) => sum + (b?.amount ?? 0),
          0,
        );
        setUser((prev: User | null) =>
          prev
            ? { ...prev, balance: (prev.balance ?? 0) + totalConfirmBet }
            : prev,
        );
        clearPendingBetsForDesk(desk.id, lastRound.id, user!, setUser);
        setPendingBets({});
        setConfirmedBets({});
        setAmount("0");
        setConfirmMessage("cancelled");
      }
    } catch (error) {
      console.error("Failed to remove bets:", error);
    }
  };

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (confirmMessage) {
      const timer = setTimeout(() => setConfirmMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [confirmMessage]);

  return (
    <>
      <div
        className={cn(
          "absolute w-full -top-11 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none",
          netAmount >= 1 ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <img src="/images/win.png" alt="win" className="w-[21rem] z-10" />
        <div className="absolute bottom-6 text-white text-4xl text-center bg-black/30 w-3/4 py-5">
          贏得 {Number(netAmount).toFixed(3)}
        </div>
      </div>
      <div
        className={cn(
          "absolute w-full -top-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none",
          netAmount <= -1 ? "opacity-80" : "opacity-0 pointer-events-none",
        )}
      >
        <img src="/images/lose.png" alt="lose" className="w-[21rem] z-10" />
        <div className="absolute bottom-7 text-white text-4xl text-center bg-black/30 w-3/4 py-5">
          輸了 {Math.abs(Number(netAmount)).toFixed(3)}
        </div>
      </div>

      <div className="flex justify-center gap-3 p-1 w-full">
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-3 bg-[#0b2c0b]/80 border-3 border-gray-300 overflow-hidden">
            {topRow.map((result) => (
              <BettingBoardItemWrapper
                key={`${result.key}-${changeResult}`}
                isWinner={winners.includes(result.key)}
                handleBetClick={() =>
                  result.id && handleBetClick(result.id, result.key)
                }
                className={
                  "h-[110px] w-full border-l-3 first:border-l-0 border-gray-300              "
                }
              >
                {/* className=
                {
                  " border-l-3 first:border-l-0 border-gray-300 w-[180px] h-[150px]"
                } */}
                <span className="text-2xl text-white">
                  1:{parseFloat(Number(result.ratio).toFixed(2))}
                </span>
                <span
                  className={cn(
                    "text-5xl font-bold",
                    result.key === "player" && "text-blue-400",
                    result.key === "banker" && "text-red-500",
                    result.key === "tie" && "text-green-400",
                  )}
                >
                  {result.name}
                </span>
                {(confirmedBets[result.key] || pendingBets[result.key]) && (
                  <div className="absolute top-1 right-1 text-right">
                    <span className="bg-green-700 text-white text-2xl px-5 rounded-sm">
                      {(
                        (confirmedBets[result.key]?.amount || 0) +
                        (pendingBets[result.key]?.amount || 0)
                      ).toLocaleString()}
                    </span>

                    <img
                      src={
                        pendingBets[result.key]?.image ||
                        confirmedBets[result.key]?.image
                      }
                      className="w-16 h-16 mt-1 rounded-full rotate-swing"
                    />
                  </div>
                )}
              </BettingBoardItemWrapper>
            ))}
          </div>

          <div className="grid grid-cols-2 bg-[#0b2c0b]/80 border-3 border-t-0 border-gray-300 overflow-hidden">
            {bottomRow.map((result) => (
              <BettingBoardItemWrapper
                key={`${result.key}-${changeResult}`}
                isWinner={winners.includes(result.key)}
                handleBetClick={() =>
                  result.id && handleBetClick(result.id, result.key)
                }
                className={
                  "h-[145px] w-full border-l-3 first:border-l-0 border-gray-300"
                }
              >
                <span className="text-2xl text-white">
                  1:{parseFloat(Number(result.ratio).toFixed(2))}
                </span>
                <span
                  className={cn(
                    "text-4xl font-bold",
                    result.key === "playerPair" && "text-blue-400",
                    result.key === "bankerPair" && "text-red-500",
                  )}
                >
                  {result.name}
                </span>

                {(confirmedBets[result.key] || pendingBets[result.key]) && (
                  <div className="absolute top-1 right-1 text-right">
                    <span className="bg-green-700 text-white text-2xl px-5 rounded-sm">
                      {(
                        (confirmedBets[result.key]?.amount || 0) +
                        (pendingBets[result.key]?.amount || 0)
                      ).toLocaleString()}
                    </span>

                    <img
                      src={
                        pendingBets[result.key]?.image ||
                        confirmedBets[result.key]?.image
                      }
                      className="w-16 h-16 mt-1 rounded-full rotate-swing"
                    />
                  </div>
                )}
              </BettingBoardItemWrapper>
            ))}
          </div>
        </div>

        {confirmMessage && (
          <div className="absolute w-full p-3 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <div className="p-6 text-center animate-fadeIn">
              <div className="flex justify-center">
                {confirmMessage !== "pending" && (
                  <Icons.circleCheck size={40} className="text-yellow-500" />
                )}
              </div>
              <p className="mb-4 text-white text-5xl font-semibold">
                {confirmMessage === "pending" && "等待中"}
                {confirmMessage === "cancelled" && "已取消投注"}
                {confirmMessage === "success" && "成功投注"}
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="absolute w-full p-3 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <div className="p-6 text-center animate-fadeIn">
              <div className="flex justify-center">
                <Icons.circleAlert size={40} className="text-yellow-500" />
              </div>
              <p className="mb-4 text-white text-5xl font-semibold">
                {errorMessage}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="absolute w-full flex justify-center items-center gap-2">
        {hasConfirmedBets && status === "betting" && (
          <Button
            variant="danger"
            className="w-25 p-5 text-3xl"
            onClick={handleRemove}
          >
            撤销
          </Button>
        )}

        {hasPendingBets && status === "betting" && (
          <>
            <Button
              variant="success"
              className="w-25 p-5"
              onClick={handleConfirm}
            >
              <Icon icon="mingcute:check-fill" className="!w-12 !h-12" />
            </Button>

            <Button
              variant="secondary"
              className="w-25 p-5"
              onClick={handleCancel}
            >
              <Icon icon="maki:cross" className="!w-12 !h-12" />
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default BettingBoard;
