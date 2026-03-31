import { getLastRoundResult } from "@/api/user";
import { getSocket } from "@/lib/socket";
import { useEffect, useRef, useState } from "react";

/**
 * Shared hook for round result: listens to socket updateResult and polls getLastRoundResult
 * when cards are dealt but socket may have missed. Works for longhu (dragon/tiger) and
 * baccarat (player/banker) via triggerCard (e.g. tiger card or player first card).
 * For games without cards (e.g. baccarat N), use triggerCard: null and pollWhen: true
 * when the round is past betting (e.g. status === 'dealing' || status === 'finished').
 */
export interface UseRoundResultOptions {
  deskId: number;
  lastRoundId?: number;
  /** Required for net-amount socket; omit in CardBoard etc. when only winners are needed. */
  userId?: number;
  /** When truthy, polling runs (cards dealt); e.g. longhu: tigerCard, baccarat: player.p1 */
  triggerCard: string | null;
  /** When true, polling runs even without triggerCard (e.g. baccarat N with no CardBoard). */
  pollWhen?: boolean;
  onResult?: () => void;
  onPollResult?: () => void;
}

export function useRoundResult(options: UseRoundResultOptions) {
  const {
    deskId,
    userId,
    lastRoundId,
    triggerCard,
    pollWhen,
    onResult,
    onPollResult,
  } = options;

  const [gameResult, setGameResult] = useState<string>("");
  const [changeResult, setChangeResult] = useState(0);
  const [netAmount, setNetAmount] = useState(0);
  const winners = gameResult ? gameResult.split("|") : [];

  const appliedRoundIdsRef = useRef<Set<number>>(new Set());
  const lastRoundIdRef = useRef<number | undefined>(lastRoundId);
  const onResultRef = useRef(onResult);
  const onPollResultRef = useRef(onPollResult);
  lastRoundIdRef.current = lastRoundId;
  onResultRef.current = onResult;
  onPollResultRef.current = onPollResult;

  // for socket update round result event
  useEffect(() => {
    const socket = getSocket();
    const resultEvent = `desk:${deskId}:updateResult`;

    const handleResult = (payload: {
      round_id: number;
      result: string;
      userNetAmounts?: { user_id: number; net_amount: number }[];
    }) => {
      const { round_id, result, userNetAmounts } = payload;

      if (round_id != null && appliedRoundIdsRef.current.has(round_id)) return;

      setGameResult(result);
      setChangeResult((prev) => prev + 1);

      if (userId != null && userNetAmounts?.length) {
        const myNet = userNetAmounts.find((u) => u.user_id === userId);
        if (myNet != null) setNetAmount(myNet.net_amount);
      }

      const currentRoundId = lastRoundIdRef.current;
      if (currentRoundId != null) {
        appliedRoundIdsRef.current.add(currentRoundId);
      }
      onResultRef.current?.();
    };

    socket.on(resultEvent, handleResult);
    return () => {
      socket.off(resultEvent, handleResult);
    };
  }, [deskId, userId]);

  // for polling get update round result
  useEffect(() => {
    if (gameResult || (!triggerCard && !pollWhen)) return;

    const poll = async () => {
      try {
        const res = await getLastRoundResult(deskId, lastRoundId ?? 0);
        const { round_id, result, net_amount } = res.data;

        if (
          round_id &&
          result &&
          !appliedRoundIdsRef.current.has(round_id) &&
          lastRoundId === round_id
        ) {
          appliedRoundIdsRef.current.add(round_id);
          setNetAmount(net_amount ?? 0);
          setGameResult(result);
          setChangeResult((prev) => prev + 1);
          onResultRef.current?.();
          onPollResultRef.current?.();
        }
      } catch {
        // Silently ignore poll errors to avoid spamming on network issues
      }
    };

    const intervalId = setInterval(poll, 5000);
    return () => clearInterval(intervalId);
  }, [gameResult, deskId, lastRoundId, triggerCard, pollWhen]);

  useEffect(() => {
    if (!gameResult) return;
    const timer = setTimeout(() => {
      setGameResult("");
      setNetAmount(0);
    }, 5000);
    return () => clearTimeout(timer);
  }, [changeResult, gameResult]);

  return { gameResult, changeResult, winners, netAmount };
}
