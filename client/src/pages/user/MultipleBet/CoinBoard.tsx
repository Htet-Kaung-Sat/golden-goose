import Calculator from "@/components/shared/betting-board/Calculator";
import CoinsBox from "@/components/shared/betting-board/CoinsBox";
import { useEffect, useState } from "react";

interface CoinBoardProps {
  selectedCoin: { value: number } | null;
  setSelectedCoin: (coin: { value: number }) => void;
  amount: string;
  setAmount: (v: string) => void;
}

const CoinBoard: React.FC<CoinBoardProps> = ({
  selectedCoin,
  setSelectedCoin,
  amount,
  setAmount,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

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
      <div className="flex items-center justify-center gap-5 absolute w-full bottom-0 bg-black h-[160px]">
        <CoinsBox
          selectedCoin={selectedCoin}
          setSelectedCoin={setSelectedCoin}
          isMultiple
        />
        <Calculator
          amount={amount}
          setAmount={setAmount}
          className="mr-10"
          imgClassName="w-24"
        />
      </div>
    </>
  );
};

export default CoinBoard;
