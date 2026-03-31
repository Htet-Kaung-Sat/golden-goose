import { cn } from "@/lib/utils";

const BettingBoardItemWrapper = ({
  isWinner,
  handleBetClick,
  className,
  justifyStart = false,
  children,
}: {
  isWinner: boolean;
  handleBetClick: () => void;
  className?: string;
  justifyStart?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        // "border-l-3 first:border-l-0 border-gray-300 w-[180px] h-[150px]",
        className,
      )}
    >
      <div
        onClick={handleBetClick}
        className={cn(
          "relative flex flex-col items-center w-full h-full",
          justifyStart ? "justify-start" : "justify-center",
          "cursor-pointer transition-transform duration-150 hover:scale-105",
          isWinner && "flash-win",
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default BettingBoardItemWrapper;
