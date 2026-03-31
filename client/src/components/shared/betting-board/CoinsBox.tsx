import { useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

export const coins = [
  { value: 5, image: "/images/coins/5chip.png" },
  { value: 10, image: "/images/coins/10chip.png" },
  { value: 50, image: "/images/coins/50chip.png" },
  { value: 100, image: "/images/coins/100chip.png" },
  { value: 500, image: "/images/coins/500chip.png" },
  { value: 1000, image: "/images/coins/1000chip.png" },
  { value: 5000, image: "/images/coins/5000chip.png" },
  { value: 10000, image: "/images/coins/10000chip.png" },
];
const multipleCoins = [
  { value: 1, image: "/images/coins/1chip.png" },
  ...coins,
  { value: 50000, image: "/images/coins/50000chip.png" },
];

const CoinsBox = ({
  selectedCoin,
  setSelectedCoin,
  isMultiple = false,
}: {
  selectedCoin: { value: number } | null;
  setSelectedCoin: (coin: { value: number }) => void;
  isMultiple?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCoinClickNext = () => {
    if (!selectedCoin) return;
    const currentIndex = filteredCoins.findIndex(
      (c) => c.value === selectedCoin.value,
    );
    const nextIndex = currentIndex + 1;
    if (nextIndex >= filteredCoins.length) return;
    setSelectedCoin({ value: filteredCoins[nextIndex].value });
  };

  const handleCoinClickPrev = () => {
    if (!selectedCoin) return;
    const currentIndex = filteredCoins.findIndex(
      (c) => c.value === selectedCoin.value,
    );
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) return;
    setSelectedCoin({ value: filteredCoins[prevIndex].value });
  };

  const filteredCoins = isMultiple ? multipleCoins : coins;

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-black right-0 rounded-sm",
        {
          "w-full": isMultiple,
        },
      )}
    >
      <Icon
        icon="ep:arrow-left-bold"
        width={isMultiple ? "52" : "48"}
        height={isMultiple ? "52" : "48"}
        className={cn(
          "text-yellow-500 cursor-pointer hover:text-gray-300 flex-shrink-0",
          { "opacity-50 cursor-not-allowed": !selectedCoin },
        )}
        onClick={handleCoinClickPrev}
      />

      <div
        ref={scrollRef}
        className={cn(
          "flex items-center justify-between overflow-x-auto overflow-y-hidden p-3 gap-3 mt-0 scrollbar-hide scroll-smooth w-160",
          {
            "w-full": isMultiple,
          },
        )}
      >
        {filteredCoins.map((coin) => (
          <div
            key={coin.value}
            onClick={() => setSelectedCoin({ value: coin.value })}
            className={cn(
              `relative flex-shrink-0 flex items-center justify-center rounded-full border-2 border-gray-400 ${
                isMultiple ? "w-30 h-30" : "w-16 h-16"
              }`,
              "transition-transform duration-200 transform-gpu will-change-transform cursor-pointer",
              selectedCoin?.value === coin.value
                ? `${isMultiple ? "scale-120" : "scale-130"}`
                : `${isMultiple ? "hover:scale-120" : "hover:scale-130"}`,
            )}
          >
            <img
              src={coin.image}
              alt={`coin-${coin.value}`}
              loading="lazy"
              width={isMultiple ? 112 : 64}
              height={isMultiple ? 112 : 64}
              className={`w-full h-full object-cover rounded-full transition-all duration-200 ${
                selectedCoin?.value === coin.value
                  ? "opacity-100"
                  : "opacity-70"
              }`}
            />
          </div>
        ))}
      </div>

      <Icon
        icon="ep:arrow-right-bold"
        width={isMultiple ? "52" : "48"}
        height={isMultiple ? "52" : "48"}
        className={cn(
          "text-yellow-500 cursor-pointer hover:text-gray-300 flex-shrink-0",
          {
            "opacity-50 cursor-not-allowed": !selectedCoin,
          },
        )}
        onClick={handleCoinClickNext}
      />
    </div>
  );
};

export default CoinsBox;
