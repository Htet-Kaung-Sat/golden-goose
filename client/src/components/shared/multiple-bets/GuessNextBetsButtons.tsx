import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Result } from "@/types/Result";
import { useRef, useState } from "react";

const GuessNextBetsButtons = ({
  setResults,
  gameType,
  isGamePlayer = false,
}: {
  gameType: string;
  setResults: (
    results: Result[] | ((prevResults: Result[]) => Result[]),
  ) => void;
  isGamePlayer?: boolean;
}) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [clickedButton, setClickedButton] = useState<string | null>(null);

  const handleGuessBtnClick = (buttonType: string) => {
    setClickedButton(buttonType);
    setTimeout(() => {
      setClickedButton(null);
    }, 200);
  };

  const handleGuessNextBet = (
    type: "dragon" | "tiger" | "banker" | "player",
  ) => {
    handleGuessBtnClick(type);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setResults((prevResults) => prevResults.filter((r) => !r.isGuess));

    setResults((prevResults) => [
      ...prevResults,
      {
        key: `${type}Double|${type}|${type}Double`,
        isGuess: true,
      },
    ]);

    timeoutRef.current = setTimeout(() => {
      setResults((prevResults) => prevResults.filter((r) => !r.isGuess));
      timeoutRef.current = null;
    }, 7000);
  };

  return (
    <>
      {isGamePlayer ? (
        <div className="min-w-[80px] grid grid-rows-2 bg-[#3a2f1d] text-white text-center p-1 gap-1">
          <div
            className={cn(
              "flex items-center justify-between border-none cursor-pointer ",
              {
                "scale-110":
                  clickedButton ===
                  (gameType === "LONGHU" ? "dragon" : "banker"),
              },
            )}
            onClick={() =>
              handleGuessNextBet(gameType === "LONGHU" ? "dragon" : "banker")
            }
          >
            <div className="flex flex-cols items-center bg-[#c02d2d] w-18 h-full p-2 gap-1">
              <div className="w-[30%] text-xs">庄问路</div>
              <div className="flex flex-col items-center justify-center bg-white h-full rounded-sm p-1">
                <div className="w-3 h-3 border-2 border-red-600 rounded-full mb-[6px]"></div>
                <div className="w-3 h-3 bg-red-600 rounded-full mb-[10px]"></div>
                <div className="w-3 h-[3px] bg-red-600 rotate-135"></div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center justify-between border-none cursor-pointer ",
              {
                "scale-110":
                  clickedButton ===
                  (gameType === "LONGHU" ? "tiger" : "player"),
              },
            )}
            onClick={() =>
              handleGuessNextBet(gameType === "LONGHU" ? "tiger" : "player")
            }
          >
            <div className="flex flex-cols items-center bg-[#1d74d4] w-18 h-full p-2 gap-1">
              <div className="w-[30%] text-xs">闲问路</div>
              <div className="flex flex-col items-center justify-center bg-white h-full rounded-sm p-1">
                <div className="w-3 h-3 border-2 border-blue-500 rounded-full mb-[6px]"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full mb-[10px]"></div>
                <div className="w-3 h-[3px] bg-blue-500 rotate-135"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 m-1 ">
          <Button
            size={"sm"}
            className={cn("bg-[#780b0b] hover:bg-[#5f1111] rounded-none", {
              "scale-110":
                clickedButton === (gameType === "LONGHU" ? "dragon" : "banker"),
            })}
            onClick={() =>
              handleGuessNextBet(gameType === "LONGHU" ? "dragon" : "banker")
            }
          >
            闲问路
          </Button>
          <Button
            size={"sm"}
            className={cn("bg-[#0a3a6d] hover:bg-[#162c49] rounded-none", {
              "scale-110":
                clickedButton === (gameType === "LONGHU" ? "tiger" : "player"),
            })}
            onClick={() =>
              handleGuessNextBet(gameType === "LONGHU" ? "tiger" : "player")
            }
          >
            闲问路
          </Button>
        </div>
      )}
    </>
  );
};

export default GuessNextBetsButtons;
