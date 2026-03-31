import { coins } from "@/components/shared/betting-board/CoinsBox";

/**
 * Returns the coin whose value is the largest chip <= amount.
 * Used to pick the display chip image for a bet amount (e.g. 400 shows 100, 500+ shows 500).
 */
export const getNearestCoin = (amount: number) => {
  const sorted = [...coins].sort((a, b) => a.value - b.value);
  if (amount <= sorted[0].value) return sorted[0];

  let chosen = sorted[0];
  for (const coin of sorted) {
    if (coin.value <= amount) {
      chosen = coin;
    } else {
      break;
    }
  }
  return chosen;
};
