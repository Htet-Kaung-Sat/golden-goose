import { useState } from "react";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface CalculatorProps {
  amount: string;
  setAmount: (v: string) => void;
  className?: string;
  imgClassName?: string;
}

const Calculator: React.FC<CalculatorProps> = ({ amount, setAmount, className, imgClassName }) => {
  const [showKeypad, setShowKeypad] = useState(false);

  const handleKeyPress = (key: string) => {
    if (key === "C") return setAmount("0");
    if (key === "OK") return setShowKeypad(false);

    if ((key === "0" || key === "00" || key === "000") && amount === "0")
      return;

    const newAmount = amount === "0" ? key : amount + key;
    if (Number(newAmount) > 1000000) {
      setAmount("1000000");
      return;
    }

    setAmount(newAmount);
  };

  return (
    <>
      <div
        className={cn("relative cursor-pointer", className)}
        onClick={() => setShowKeypad(true)}
      >
        <img
          src="/images/calculator.png"
          alt="calculator"
          className={cn("w-18 object-contain", imgClassName)}
        />
        <span
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl",
            "text-white font-bold border-2 border-yellow-500 py-1 rounded-md bg-black",
          )}
        >
          {amount}
        </span>
      </div>

      {showKeypad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-[#3b2c1a] p-1 rounded-lg shadow-lg text-white w-100">
            <button
              onClick={() => setShowKeypad(false)}
              className="absolute top-[-15px] right-[-15px] text-white bg-[#3b2c1a] border-1 border-yellow-500 rounded-full w-12 h-12 flex items-center justify-center"
            >
              <Icons.x
                className="text-white cursor-pointer hover:text-gray-300"
                size={28}
              />
            </button>

            <div className="text-2xl font-bold mb-3 text-center bg-black p-5">
              {amount}
            </div>

            <div className="grid grid-cols-4 gap-1">
              <div className="col-span-3 grid grid-cols-3 gap-1">
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "0",
                  "00",
                  "000",
                ].map((key, idx) => (
                  <button
                    key={idx}
                    onClick={() => key && handleKeyPress(key)}
                    className="py-3 rounded-md text-lg font-semibold bg-[#5a4631] hover:bg-[#7a6341] active:bg-[#8b7345] transition-colors duration-150"
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-1">
                <button
                  onClick={() => handleKeyPress("C")}
                  className="py-3 rounded-md text-lg font-semibold bg-[#4b3b28] hover:bg-[#6b5b38] active:bg-[#7b6b42] transition-colors duration-150"
                >
                  C
                </button>
                <button
                  onClick={() => handleKeyPress("OK")}
                  className="py-3 rounded-md text-lg font-semibold bg-green-600 hover:bg-green-500 active:bg-green-400 transition-colors duration-150"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Calculator;
