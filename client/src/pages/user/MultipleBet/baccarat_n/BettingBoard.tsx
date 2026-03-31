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
import { Result } from "@/types/Result";
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

  const playerPair = game.results.find(
    (r) => r.key === "playerPair" && r.baccarat_type === "N",
  );
  const playerBet = game.results.find(
    (r) => r.key === "player" && r.baccarat_type === "N",
  );
  const tie = game.results.find(
    (r) => r.key === "tie" && r.baccarat_type === "N",
  );
  const superTwoSix = game.results.find(
    (r) => r.key === "supertwoSix" && r.baccarat_type === "N",
  );
  const superThreeSix = game.results.find(
    (r) => r.key === "superthreeSix" && r.baccarat_type === "N",
  );
  const bankerBet = game.results.find(
    (r) => r.key === "banker" && r.baccarat_type === "N",
  );
  const bankerPair = game.results.find(
    (r) => r.key === "bankerPair" && r.baccarat_type === "N",
  );

  const getSuperSixAmount = () =>
    (pendingBets["supertwoSix"]?.amount || 0) +
    (pendingBets["superthreeSix"]?.amount || 0) +
    (confirmedBets["supertwoSix"]?.amount || 0) +
    (confirmedBets["superthreeSix"]?.amount || 0);

  const getSuperSixImage =
    pendingBets["supertwoSix"]?.image ||
    pendingBets["superthreeSix"]?.image ||
    confirmedBets["supertwoSix"]?.image ||
    confirmedBets["superthreeSix"]?.image;

  return (
    <>
      <div
        className={cn(
          "absolute w-full -top-11 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none",
          netAmount >= 1 ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <img src="/images/win.png" alt="win" className="w-[21rem] z-10" />
        <div className="absolute bottom-7 text-white text-4xl text-center bg-black/30 w-3/4 py-5">
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

      <div className="flex justify-center p-1 w-full">
        <div className="w-full max-w-[720px] bg-[#0b2c0b]/90 border-3 border-gray-300 overflow-hidden">
          <div className="grid grid-cols-3 h-[110px] border-b-3 border-gray-300">
            {playerBet && (
              <BetCell
                key={`${playerBet.key}-${changeResult}`}
                result={playerBet}
                onClick={() => handleBetClick(playerBet.id!, playerBet.key)}
                isWin={winners.includes(playerBet.key)}
                pendingAmount={pendingBets[playerBet.key]?.amount}
                confirmedAmount={confirmedBets[playerBet.key]?.amount}
                image={
                  pendingBets[playerBet.key]?.image ||
                  confirmedBets[playerBet.key]?.image
                }
              />
            )}

            <div className="flex flex-col border-l-3 border-r-3 border-gray-300">
              {tie && (
                <BetCell
                  key={`tie-${changeResult}`}
                  result={tie}
                  half
                  onClick={() => handleBetClick(tie.id!, tie.key)}
                  isWin={winners.includes(tie.key)}
                  pendingAmount={pendingBets[tie.key]?.amount}
                  confirmedAmount={confirmedBets[tie.key]?.amount}
                  image={
                    pendingBets[tie.key]?.image || confirmedBets[tie.key]?.image
                  }
                />
              )}

              {/* SUPER SIX */}
              {(superTwoSix || superThreeSix) && (
                <BetCell
                  half
                  key={`superSix-${changeResult}`}
                  result={{
                    ...(superTwoSix || superThreeSix)!,
                    key: "superSix",
                    name: "超6",
                  }}
                  onClick={() => {
                    if (superTwoSix?.id) {
                      handleBetClick(superTwoSix.id, superTwoSix.key);
                    }
                  }}
                  isWin={
                    winners.includes("supertwoSix") ||
                    winners.includes("superthreeSix")
                  }
                  pendingAmount={getSuperSixAmount()}
                  confirmedAmount={0}
                  image={getSuperSixImage}
                />
              )}
            </div>

            {bankerBet && (
              <BetCell
                key={`${bankerBet.key}-${changeResult}`}
                result={bankerBet}
                onClick={() => handleBetClick(bankerBet.id!, bankerBet.key)}
                isWin={winners.includes(bankerBet.key)}
                pendingAmount={pendingBets[bankerBet.key]?.amount}
                confirmedAmount={confirmedBets[bankerBet.key]?.amount}
                image={
                  pendingBets[bankerBet.key]?.image ||
                  confirmedBets[bankerBet.key]?.image
                }
                bankerNote
              />
            )}
          </div>

          <div className="grid grid-cols-2 h-[145px]">
            {[playerPair, bankerPair].map(
              (result) =>
                result && (
                  <BetCell
                    key={`${result.key}-${changeResult}`}
                    result={result}
                    onClick={() => handleBetClick(result.id!, result.key)}
                    isWin={winners.includes(result.key)}
                    pendingAmount={pendingBets[result.key]?.amount}
                    confirmedAmount={confirmedBets[result.key]?.amount}
                    image={
                      pendingBets[result.key]?.image ||
                      confirmedBets[result.key]?.image
                    }
                  />
                ),
            )}
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

interface BetCellProps {
  result: Result;
  half?: boolean;
  bankerNote?: boolean;
  onClick: () => void;
  isWin: boolean;
  pendingAmount?: number;
  confirmedAmount?: number;
  image?: string;
}

const BetCell: React.FC<BetCellProps> = ({
  result,
  half = false,
  bankerNote = false,
  onClick,
  isWin,
  pendingAmount = 0,
  confirmedAmount = 0,
  image,
}) => {
  const totalAmount = pendingAmount + confirmedAmount;

  const color = result.key.includes("player")
    ? "text-blue-400"
    : result.key.includes("banker")
      ? "text-red-500"
      : result.key === "tie"
        ? "text-green-400"
        : "text-white";

  return (
    <BettingBoardItemWrapper
      handleBetClick={onClick}
      isWinner={isWin}
      justifyStart={
        bankerNote || result.key === "banker" || result.key === "player"
      }
      className={cn(
        "w-full",
        half ? "h-1/2" : "h-full",
        result.key === "playerPair" && "border-r-3 border-gray-300",
        result.key === "tie" && "border-b-3 border-gray-300",
      )}
    >
      {result.key === "superSix" ? (
        <div className="flex gap-2">
          <span className="text-white text-2xl font-bold">超6</span>
          <div className="flex flex-col gap-3">
            <span className="text-white text-[7px]">1:12 庄两张牌照</span>
            <span className="text-white text-[7px]">1:20 庄三张牌照</span>
          </div>
        </div>
      ) : result.key === "tie" ? (
        <div className="flex gap-2 items-center">
          <span className={cn("font-bold text-2xl", color)}>{result.name}</span>
          <span className="text-white text-xl transform rotate-[-90deg] origin-center">
            1:{parseFloat(Number(result.ratio).toFixed(2))}
          </span>
        </div>
      ) : (
        <>
          <span className="text-white text-xl">
            1:{parseFloat(Number(result.ratio).toFixed(2))}
          </span>
          <span
            className={cn(
              "font-bold",
              color,
              result.key === "banker" || result.key === "player"
                ? "text-5xl"
                : "text-4xl",
            )}
          >
            {result.name}
          </span>
        </>
      )}

      {bankerNote && (
        <span className="absolute bottom-1 text-sm text-white">
          免佣庄6点赔0.5
        </span>
      )}

      {totalAmount > 0 &&
        image &&
        (result.key === "tie" || result.key === "superSix" ? (
          <div className="flex absolute top-1 right-1 text-right">
            <img
              src={image}
              className="w-10 h-10 mt-1 rounded-full rotate-swing"
            />
            <div>
              <span className="bg-green-700 text-white text-xl px-1 rounded-sm">
                {totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="absolute top-1 right-1 text-right">
            <span className="bg-green-700 text-white text-xl px-3 rounded-sm">
              {totalAmount.toLocaleString()}
            </span>
            <img
              src={image}
              className="w-15 h-15 mt-1 rounded-full rotate-swing"
            />
          </div>
        ))}
    </BettingBoardItemWrapper>
  );
};
