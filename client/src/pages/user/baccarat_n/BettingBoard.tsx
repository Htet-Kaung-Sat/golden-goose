import { cancelBetResult, createBetResult, getConfirmedBets } from "@/api/user";
import BettingBoardItemWrapper from "@/components/shared/betting-board/BettingBoardItemWrapper";
import Calculator from "@/components/shared/betting-board/Calculator";
import CoinsBox from "@/components/shared/betting-board/CoinsBox";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useGameContext } from "@/contexts/GameContext";
import { useRoundResult } from "@/hooks/useRoundResult";
import { cn } from "@/lib/utils";
import { ConfirmedBets, Desk, Game } from "@/types";
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

interface GamePlayerProps {
  desk: Desk;
  game: Game;
}

const BettingBoard: React.FC<GamePlayerProps> = ({ desk, game }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [pendingBets, setPendingBets] = useState<
    Record<string, { id: number; amount: number; image: string }>
  >({});
  const [confirmedBets, setConfirmedBets] = useState<ConfirmedBets>({});
  const {
    status,
    statusDeskId,
    betBalance,
    setBetBalance,
    user,
    setUser,
    triggerRefresh,
    amount,
    setAmount,
    selectedCoin,
    setSelectedCoin,
  } = useGameContext();
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
      setBetBalance(0);
      setAmount("0");
    },
  });

  const hasPendingBets = Object.keys(pendingBets).length > 0;
  const hasConfirmedBets = Object.keys(confirmedBets).length > 0;

  useEffect(() => {
    if (statusDeskId !== desk.id) return;
    if (status !== "betting") {
      if (!user || !desk.last_round) return;
      clearPendingBetsForDesk(desk.id, desk.last_round.id, user, setUser);
      setPendingBets({});
    }
  }, [status, statusDeskId, desk.id]);

  useEffect(() => {
    fetchConfirmedBets();
  }, [desk.last_round]);

  const fetchConfirmedBets = async () => {
    if (!desk.last_round) return;
    try {
      const result = await getConfirmedBets(desk.last_round.id);
      if (result.data.confirmedBets)
        setConfirmedBets(result.data.confirmedBets);
      if (result.data.totalBetAmount) {
        setBetBalance(result.data.totalBetAmount);
      } else {
        setBetBalance(0);
      }
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
      `pendingBets:${desk.id}:${desk.last_round?.id}`,
      JSON.stringify(newPending),
    );
  };

  useEffect(() => {
    if (status !== "betting" || statusDeskId !== desk.id) return;
    if (!desk?.id || !desk.last_round?.id) return;

    const key = `pendingBets:${desk.id}:${desk.last_round.id}`;
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
  }, [status, statusDeskId, desk?.id, desk.last_round?.id]);

  const handleCancel = () => {
    if (!user || !desk.last_round) return;
    setPendingBets({});
    clearPendingBetsForDesk(desk.id, desk.last_round.id, user, setUser);
  };

  const handleConfirm = async () => {
    if (!hasPendingBets || !desk.last_round) return;
    setConfirmMessage("pending");

    try {
      const betArray = Object.keys(pendingBets).map((key) => ({
        result_id: pendingBets[key].id,
        amount: pendingBets[key].amount,
        image: pendingBets[key].image,
      }));

      const result = await createBetResult({
        last_round: desk.last_round.id,
        bets: betArray,
      });

      if (result.success) {
        setBetBalance(result.data.totalBetAmount);
        const currentDeskKey = `pendingBets:${desk.id}:${desk.last_round.id}`;
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
        localStorage.removeItem(`pendingBets:${desk.id}:${desk.last_round.id}`);
        setConfirmMessage("success");
      }
    } catch (err) {
      console.error("Failed to confirm bets:", err);
      setErrorMessage("投注失败");
      setConfirmMessage(null);
    }
  };

  const handleRemove = async () => {
    if (!desk.last_round) return;

    setConfirmMessage("pending");

    try {
      const result = await cancelBetResult({
        last_round: desk.last_round.id,
      });

      if (result.success) {
        setUser((prev: User | null) =>
          prev ? { ...prev, balance: (prev.balance ?? 0) + betBalance } : prev,
        );
        clearPendingBetsForDesk(desk.id, desk.last_round.id, user!, setUser);
        setPendingBets({});
        setConfirmedBets({});
        setBetBalance(0);
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
          "absolute -top-[22.5rem] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none",
          netAmount >= 1 ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <img src="/images/win.png" alt="win" className="h-[34rem] z-10" />
        <div className="absolute bottom-7 text-white text-5xl text-center font-bold bg-black/40 w-5/6 py-13">
          贏得 {Number(netAmount).toFixed(3)}
        </div>
      </div>
      <div
        className={cn(
          "absolute -top-[21.5rem] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none",
          netAmount <= -1 ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <img src="/images/lose.png" alt="lose" className="h-[34rem] z-20" />
        <div className="absolute bottom-12 text-white text-5xl text-center font-bold bg-black/40 w-5/6 py-13">
          輸了 {Math.abs(Number(netAmount)).toFixed(3)}
        </div>
      </div>

      <div className="flex justify-center gap-3 p-1 w-full mb-8">
        <div className="flex justify-center items-stretch bg-[#0b2c0b]/80 border-3 border-gray-300 rounded-lg overflow-hidden">
          {playerPair && (
            <BetCell
              key={`${playerPair.key}-${changeResult}`}
              result={playerPair}
              onClick={() => handleBetClick(playerPair.id!, playerPair.key)}
              isWin={winners.includes(playerPair.key)}
              pendingAmount={pendingBets[playerPair.key]?.amount}
              confirmedAmount={confirmedBets[playerPair.key]?.amount}
              image={
                pendingBets[playerPair.key]?.image ||
                confirmedBets[playerPair.key]?.image
              }
            />
          )}

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

          <div className="flex flex-col w-[180px] h-[150px] border-l-3 border-gray-300">
            {tie && (
              <BetCell
                key={`${tie.key}-${changeResult}`}
                half
                result={tie}
                onClick={() => handleBetClick(tie.id!, tie.key)}
                isWin={winners.includes(tie.key)}
                pendingAmount={pendingBets[tie.key]?.amount}
                confirmedAmount={confirmedBets[tie.key]?.amount}
                image={
                  pendingBets[tie.key]?.image || confirmedBets[tie.key]?.image
                }
              />
            )}

            {(superTwoSix || superThreeSix) && (
              <BetCell
                key={`superSix-${changeResult}`}
                half
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
            />
          )}

          {bankerPair && (
            <BetCell
              key={`${bankerPair.key}-${changeResult}`}
              result={bankerPair}
              onClick={() => handleBetClick(bankerPair.id!, bankerPair.key)}
              isWin={winners.includes(bankerPair.key)}
              pendingAmount={pendingBets[bankerPair.key]?.amount}
              confirmedAmount={confirmedBets[bankerPair.key]?.amount}
              image={
                pendingBets[bankerPair.key]?.image ||
                confirmedBets[bankerPair.key]?.image
              }
            />
          )}
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

      <div className="flex items-center justify-center gap-5 absolute right-0">
        <div
          className={cn(
            "flex bg-black items-center py-3 px-5 gap-2 rounded-md",
            (hasPendingBets || hasConfirmedBets) && status === "betting"
              ? "opacity-100"
              : "opacity-0",
          )}
        >
          {hasConfirmedBets && status === "betting" && (
            <Button
              variant="danger"
              className="w-30 p-7 text-3xl"
              onClick={handleRemove}
            >
              撤销
            </Button>
          )}

          {hasPendingBets && status === "betting" && (
            <>
              <Button
                variant="success"
                className="w-30 p-7"
                onClick={handleConfirm}
              >
                <Icon icon="mingcute:check-fill" className="!w-16 !h-16" />
              </Button>

              <Button
                variant="secondary"
                className="w-30 p-7"
                onClick={handleCancel}
              >
                <Icon icon="maki:cross" className="!w-16 !h-16" />
              </Button>
            </>
          )}
        </div>
        <Calculator amount={amount} setAmount={setAmount} />
        <CoinsBox
          selectedCoin={selectedCoin}
          setSelectedCoin={setSelectedCoin}
        />
      </div>
    </>
  );
};

export default BettingBoard;

interface BetCellProps {
  result: Result;
  half?: boolean;
  onClick: () => void;
  isWin: boolean;
  pendingAmount?: number;
  confirmedAmount?: number;
  image?: string;
}

const BetCell: React.FC<BetCellProps> = ({
  result,
  half = false,
  onClick,
  isWin,
  pendingAmount = 0,
  confirmedAmount = 0,
  image,
}) => {
  const totalAmount = pendingAmount + confirmedAmount;

  return (
    <BettingBoardItemWrapper
      isWinner={isWin}
      handleBetClick={onClick}
      className={cn(
        half
          ? "h-1/2 w-full first:border-t-0 border-t-3"
          : "w-[180px] h-[150px] first:border-l-0 border-l-3 border-gray-300",
      )}
    >
      {result.key === "superSix" ? (
        <div className="flex gap-1">
          <span className="text-white font-bold text-3xl">{result.name}</span>
          <div className="flex flex-col text-white text-sm">
            <span>1:12 庄两张牌照</span>
            <span>1:20 庄三张牌照</span>
          </div>
        </div>
      ) : (
        <>
          {result.key === "banker" && (
            <span className="absolute top-0 left-0 w-full text-center text-white text-lg">
              免佣庄6点赔0.5
            </span>
          )}
          <span
            className={cn(
              "font-bold",
              half ? "text-5xl" : "text-6xl",
              result.key === "player" || result.key === "playerPair"
                ? "text-blue-400"
                : result.key === "banker" || result.key === "bankerPair"
                  ? "text-red-500"
                  : result.key === "tie"
                    ? "text-green-400"
                    : "text-white",
            )}
          >
            {result.name}
          </span>

          <span className="text-white text-3xl">
            1:{parseFloat(Number(result.ratio).toFixed(2))}
          </span>
        </>
      )}

      {totalAmount > 0 && image && (
        <div className="absolute top-1 right-1">
          <span className="bg-green-700 text-white text-xl px-4 rounded-sm">
            {totalAmount.toLocaleString()}
          </span>

          <img
            src={image}
            alt="coin"
            className={cn(
              "rounded-full rotate-swing",
              half ? "w-10 h-10" : "w-20 h-20",
            )}
          />
        </div>
      )}
    </BettingBoardItemWrapper>
  );
};
