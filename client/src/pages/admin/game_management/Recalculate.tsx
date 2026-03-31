import { getDesks } from "@/api/admin/desk";
import { getGames } from "@/api/admin/game";
import { getGameRounds } from "@/api/admin/game-round";
import { getGameSessions } from "@/api/admin/game-session";
import {
  recalculateNiuniuResult,
  recalculateResult,
} from "@/api/admin/recalculate";
import { getResults } from "@/api/admin/result";
import { getRoundResults } from "@/api/admin/round-result";
import CheckboxField from "@/components/shared/CheckboxField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { DateTimePicker } from "@/components/shared/DateTimePicker";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { cn } from "@/lib/utils";
import { Desk, Game } from "@/types";
import { GameRound } from "@/types/GameRound";
import { GameSession } from "@/types/GameSession";
import { Result } from "@/types/Result";
import { getBusinessEndDate, getBusinessStartDate } from "@/utils/BusinessDate";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { Label } from "@radix-ui/react-label";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AdminCardInputPanel from "@/components/shared/AdminCardInputPanel";
import { ConfirmRecalculateDialog } from "@/components/shared/ConfirmRecalculateDialog";
import { RoundResult } from "@/types/RoundResult";
type Seat = "banker" | "player1" | "player2" | "player3";
type HandType = "bomb" | "fiveFace" | "niuNiu" | "niu" | "noNiu";
/* ----------------------------- CARD UTILITIES ------------------------------ */
interface NiuniuCardStructure {
  banker: string[];
  player1: string[];
  player2: string[];
  player3: string[];
  first_card: string;
}
interface BaccaratCardStructure {
  banker: { b1?: string; b2?: string; b3?: string };
  player: { p1?: string; p2?: string; p3?: string };
}
interface Card {
  first_card?: string | null;
  player1?: string[];
  player2?: string[];
  player3?: string[];
  dragon?: string;
  tiger?: string;
  player?: {
    p1: string | null;
    p2: string | null;
    p3: string | null;
  };
  banker?:
    | string[]
    | {
        b1: string | null;
        b2: string | null;
        b3: string | null;
      };
}
/** Returns deal order (player1–3, banker) by first card rank for NiuNiu. */
const getDealOrderByRank = (rank: number): Seat[] => {
  if ([1, 5, 9, 13].includes(rank))
    return ["player1", "player2", "player3", "banker"];
  if ([2, 6, 10].includes(rank))
    return ["player2", "player3", "banker", "player1"];
  if ([3, 7, 11].includes(rank))
    return ["player3", "banker", "player1", "player2"];
  return ["banker", "player1", "player2", "player3"];
};
const RANK_VALUE: Record<string, number> = {
  A: 1,
  J: 11,
  Q: 12,
  K: 13,
};
const SUIT_VALUE: Record<string, number> = {
  S: 4,
  H: 3,
  C: 2,
  D: 1,
};
const HAND_TYPE_RANK: Record<HandType, number> = {
  bomb: 6,
  fiveFace: 5,
  niuNiu: 4,
  niu: 3,
  noNiu: 1,
};
const RESULT = {
  player1: "１",
  player2: "２",
  player3: "３",
};
/** Returns numeric rank value (A=1, J=11, etc.) for a card code. */
const getCardRankValue = (card: string) => {
  const rank = card.slice(1);
  return RANK_VALUE[rank] ?? Number(rank);
};
/** Returns suit sort value (S=4, H=3, C=2, D=1). */
const getCardSuitValue = (card: string) => {
  const suit = card[0];
  return SUIT_VALUE[suit];
};
/** Returns the highest card in array by rank then suit. */
const getMaxCard = (cards: string[]) => {
  return cards.reduce((max, card) => {
    const r1 = getCardRankValue(card);
    const r2 = getCardRankValue(max);

    if (r1 > r2) return card;
    if (r1 < r2) return max;

    return getCardSuitValue(card) > getCardSuitValue(max) ? card : max;
  });
};

/**
 * Recalculate page: select game/desk/session/round, then correct results for Baccarat N/B/G, Longhu, or NiuNiu.
 */
const Recalculate = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [gameSessions, setGameSessions] = useState<GameSession[]>([]);
  const [gameRounds, setGameRounds] = useState<GameRound[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [gameType, setGameType] = useState<string>("");
  const [baccaratType, setBaccaratType] = useState<string>("");
  const [deskNo, setDeskNo] = useState<string>("");
  const [gameSession, setGameSession] = useState<string>("");
  const [gameRound, setGameRound] = useState<string>("");
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<
    Record<string, boolean>
  >({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorMessage,
    setErrorFromResponse,
  } = useAuthGuard();
  const { isLoading, setIsLoading } = useLoading();
  const didFetch = useRef(false);
  const searchResultsRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const searchDesksRef = useRef<
    (gameId: number, baccaratData: string) => Promise<void>
  >(async () => {});
  const clearRecalculateValueRef = useRef<() => void>(() => {});
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-28" : "md:w-25";
  /** Business-day start for the given date/event. */
  const setStartOfCustomDay = useCallback((d: Date, event: string) => {
    return getBusinessStartDate(d, event);
  }, []);
  /** Business-day end for the given date/event. */
  const setEndOfCustomDay = useCallback((d: Date, event: string) => {
    return getBusinessEndDate(d, event);
  }, []);
  /** Initial start/end dates for today (business day). */
  const getInitialDates = useCallback(() => {
    const now = new Date();
    let initialStart = new Date(now);
    let initialEnd = new Date(now);
    initialStart = setStartOfCustomDay(initialStart, "today");
    initialEnd = setEndOfCustomDay(initialEnd, "today");
    return { initialStart, initialEnd };
  }, [setEndOfCustomDay, setStartOfCustomDay]);
  const [startDate, setStartDate] = useState<Date | null>(
    () => getInitialDates().initialStart,
  );
  const [endDate, setEndDate] = useState<Date | null>(
    () => getInitialDates().initialEnd,
  );
  useEffect(() => {
    if (!didFetch.current) {
      const initFetch = async () => {
        setIsLoading(true);
        try {
          const gameRes = await getGames();
          setGames(gameRes.data.games || []);
          if (gameRes.data.games.length > 0) {
            const firstGame = gameRes.data.games[0];
            setGameType(String(firstGame.id));
            if (firstGame.type === "BACCARAT") {
              setBaccaratType("N");
              searchDesksRef.current(firstGame.id, "N");
            } else {
              searchDesksRef.current(firstGame.id, "");
            }
          }
          clearRecalculateValueRef.current();
          setIsLoading(false);
        } catch (error) {
          setErrorFromResponse(error);
          setIsLoading(false);
        }
      };
      initFetch();
      didFetch.current = true;
    }
  }, [setErrorFromResponse, setIsLoading]);
  useEffect(() => {
    if (gameType && deskNo && gameSession && gameRound) {
      searchResultsRef.current();
    }
  }, [gameType, deskNo, gameSession, gameRound]);

  /** Fetches desks by game (and baccarat type), then first desk's sessions. */
  const searchDesks = async (gameId: number, baccaratData: string) => {
    if (!gameId) {
      setDesks([]);
      setDeskNo("");
      setGameSessions([]);
      setGameSession("");
      setGameRounds([]);
      setGameRound("");
      setResults([]);
      setSelectedCheckboxes({});
      clearRecalculateValue();
      return;
    }
    const filters: { game_id: number; likeName?: string } = {
      game_id: gameId,
    };
    const selectedGame = games.find((g) => g.id == gameId);
    if (selectedGame?.type === "BACCARAT") {
      filters.likeName = baccaratData;
    }
    setIsLoading(true);
    try {
      const deskRes = await getDesks(filters);
      setDesks(deskRes.data.desks || []);
      if (deskRes.data.desks.length > 0) {
        setDeskNo(String(deskRes.data.desks[0].id));
        searchGameSessions(deskRes.data.desks[0].id, startDate, endDate);
      } else {
        setGameSessions([]);
        setGameSession("");
        setGameRounds([]);
        setGameRound("");
        setResults([]);
        setSelectedCheckboxes({});
        clearRecalculateValue();
      }
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };
  searchDesksRef.current = searchDesks;

  /** Fetches game sessions for desk and date range, then first session's rounds. */
  const searchGameSessions = async (
    deskId: number,
    startDate: Date | null,
    endDate: Date | null,
  ) => {
    if (!deskId) {
      setGameRounds([]);
      setGameRound("");
      setResults([]);
      setSelectedCheckboxes({});
      clearRecalculateValue();
      return;
    }
    const filters = {
      desk_id: deskId,
      startDate: startDate ? formatLocalDateTime(String(startDate)) : "",
      endDate: endDate ? formatLocalDateTime(String(endDate)) : "",
    };
    setIsLoading(true);
    try {
      const sessionRes = await getGameSessions(filters);
      setGameSessions(sessionRes.data.sessions || []);
      if (sessionRes.data.sessions.length > 0) {
        setGameSession(String(sessionRes.data.sessions[0].id));
        searchGameRounds(sessionRes.data.sessions[0].id, startDate, endDate);
      } else {
        setGameRounds([]);
        setGameRound("");
        setResults([]);
        setSelectedCheckboxes({});
        clearRecalculateValue();
      }
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };
  /** Fetches finished game rounds for session and date range. */
  const searchGameRounds = async (
    sessionId: number,
    startDate: Date | null,
    endDate: Date | null,
  ) => {
    setGameRounds([]);
    setGameRound("");
    if (!sessionId) {
      setResults([]);
      setSelectedCheckboxes({});
      clearRecalculateValue();
      return;
    }
    const filters = {
      session_id: sessionId,
      startDate: startDate ? formatLocalDateTime(String(startDate)) : "",
      endDate: endDate ? formatLocalDateTime(String(endDate)) : "",
      status: "finished",
    };
    setIsLoading(true);
    try {
      const roundRes = await getGameRounds(filters);
      setGameRounds(roundRes.data.rounds || []);
      if (roundRes.data.rounds.length > 0) {
        setGameRound(String(roundRes.data.rounds[0].id));
      } else {
        setResults([]);
        setSelectedCheckboxes({});
        clearRecalculateValue();
      }
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };
  /** Loads results/round results for selected round; for N/G/Longhu loads cards into UI. */
  const searchResults = async () => {
    setResults([]);
    setSelectedCheckboxes({});
    clearRecalculateValue();
    if (!gameType || !deskNo || !gameSession || !gameRound) {
      return;
    }
    setIsLoading(true);
    try {
      if (baccaratType === "N" || baccaratType === "B") {
        const filters: { game_id: number; baccarat_type?: string } = {
          game_id: Number(gameType),
        };
        const selectedGame = games.find((g) => g.id == Number(gameType));
        if (selectedGame?.type === "BACCARAT") {
          filters.baccarat_type = baccaratType;
        }
        const resultRes = await getResults(filters);
        setResults(resultRes.data.results || []);
        const roundResultRes = await getRoundResults({
          round_id: Number(gameRound),
          include: "result",
        });
        setRoundResults(roundResultRes.data.roundResults || []);
        const currentRoundResults = roundResultRes.data.roundResults || [];
        const initialCheckedState: Record<string, boolean> = {};
        currentRoundResults.forEach((item) => {
          initialCheckedState[String(item.result_id)] = true;
        });
        setSelectedCheckboxes(initialCheckedState);
      } else {
        const filters = {
          session_id: Number(gameSession),
          startDate: startDate ? formatLocalDateTime(String(startDate)) : "",
          endDate: endDate ? formatLocalDateTime(String(endDate)) : "",
          status: "finished",
        };
        const roundRes = await getGameRounds(filters);
        setGameRounds(roundRes.data.rounds || []);
        const selectedRoundData = roundRes.data.rounds.find(
          (r) => String(r.id) === String(gameRound),
        );
        if (selectedRoundData) {
          const c = selectedRoundData?.cards;
          setInitialCards(selectedRoundData?.cards);
          if (games.find((g) => g.id == Number(gameType))?.type === "NIUNIU") {
            loadCardsFromRound(selectedRoundData);
          } else if (
            games.find((g) => g.id == Number(gameType))?.type === "LONGHU"
          ) {
            setDragonCard(c?.dragon || null);
            setTigerCard(c?.tiger || null);
            setIsLonghuFinished(true);
          } else if (
            baccaratType === "G" &&
            c &&
            "player" in c &&
            "banker" in c
          ) {
            loadBaccaratRound(c as BaccaratCardStructure);
          }
        }
      }
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };
  searchResultsRef.current = searchResults;

  // Baccarat N and Baccarat B
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card | undefined>(
    undefined,
  );
  const [initialCards, setInitialCards] = useState<Card | undefined>(undefined);
  const [confirmRecalculateDialogOpen, setConfirmRecalculateDialogOpen] =
    useState(false);
  const showNResults = [
    { key: "banker|bankerPair", name: "庄|(庄对)" },
    { key: "player|bankerPair", name: "闲|(庄对)" },
    { key: "tie|bankerPair", name: "和|(庄对)" },
    { key: "banker|supertwoSix|bankerPair", name: "超6(两张)|(庄对)" },
    { key: "banker|superthreeSix|bankerPair", name: "6(三张)|(庄对)" },
    { key: "banker|playerPair", name: "庄|(闲对)" },
    { key: "player|playerPair", name: "闲|(闲对)" },
    { key: "tie|playerPair", name: "和|(闲对)" },
    { key: "banker|supertwoSix|playerPair", name: "超6(两张)|(闲对)" },
    { key: "banker|superthreeSix|playerPair", name: "6(三张)|(闲对)" },
    { key: "banker|bankerPair|playerPair", name: "庄|(庄/闲对)" },
    { key: "player|bankerPair|playerPair", name: "闲|(庄/闲对)" },
    { key: "tie|bankerPair|playerPair", name: "和|(庄/闲对)" },
    {
      key: "banker|supertwoSix|bankerPair|playerPair",
      name: "超6(两张)|(庄/闲对)",
    },
    {
      key: "banker|superthreeSix|bankerPair|playerPair",
      name: "6(三张)|(庄/闲对)",
    },
    { key: "banker", name: "庄" },
    { key: "player", name: "闲" },
    { key: "tie", name: "和" },
    { key: "banker|supertwoSix", name: "超6(两张)" },
    { key: "banker|superthreeSix", name: "6(三张)" },
  ];
  const showBResults = [
    { key: "banker|bankerPair", name: "庄|(庄对)" },
    { key: "player|bankerPair", name: "闲|(庄对)" },
    { key: "tie|bankerPair", name: "和|(庄对)" },
    { key: "banker|playerPair", name: "庄|(闲对)" },
    { key: "player|playerPair", name: "闲|(闲对)" },
    { key: "tie|playerPair", name: "和|(闲对)" },
    { key: "banker|bankerPair|playerPair", name: "庄|(庄/闲对)" },
    { key: "player|bankerPair|playerPair", name: "闲|(庄/闲对)" },
    { key: "tie|bankerPair|playerPair", name: "和|(庄/闲对)" },
    { key: "banker", name: "庄" },
    { key: "player", name: "闲" },
    { key: "tie", name: "和" },
  ];
  /** Opens confirm dialog to apply selected result (Baccarat N/B). */
  const handleResultClick = (result: Result) => {
    setSelectedResult(result);
    setConfirmRecalculateDialogOpen(true);
  };
  /** Applies selected result change for Baccarat N/B (validates same result/cards). */
  const confirmResult = async () => {
    setConfirmRecalculateDialogOpen(false);
    if (!selectedResult || !gameType || !deskNo || !gameSession || !gameRound)
      return;
    const keysFromRoundResults = roundResults
      .map((item) => item?.result?.key)
      .filter((key): key is string => Boolean(key));
    const keysFromSelectedResult = selectedResult.key.split("|");
    const isSame =
      keysFromRoundResults.length === keysFromSelectedResult.length &&
      keysFromRoundResults.every((key) => keysFromSelectedResult.includes(key));
    if (isSame) {
      setErrorMessage("Result is Same");
      setErrorDialogOpen(true);
      return;
    }
    const areValuesIdentical = (a: Card, b: Card) => {
      const normalize = (obj: Card) => {
        if (!obj) return null;
        return {
          banker: obj.banker,
          player: obj.player,
        };
      };
      const current = normalize(a);
      const original = normalize(b);
      return JSON.stringify(current) === JSON.stringify(original);
    };
    if (initialCards && selectedCards) {
      if (areValuesIdentical(initialCards, selectedCards)) {
        setErrorMessage("Result is Same");
        setErrorDialogOpen(true);
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await recalculateResult({
        round_id: Number(gameRound),
        result: selectedResult.key,
        game_id: Number(gameType),
        baccarat_type: baccaratType ? baccaratType : null,
        cards: selectedCards,
      });
      if (result.success) {
        setSuccessDialogOpen(true);
      }
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };

  // Baccarat G
  /* ---------------- CARD DISPLAY STATES ---------------- */
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [playerCards, setPlayerCards] = useState<string[]>(["back", "back"]);
  const [bankerCards, setBankerCards] = useState<string[]>(["back", "back"]);
  const [playerDraw, setPlayerDraw] = useState<string | null>(null);
  const [bankerDraw, setBankerDraw] = useState<string | null>(null);
  const [manualCards, setManualCards] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  /** Loads Baccarat G round cards into player/banker display and manual cards. */
  const loadBaccaratRound = (data: BaccaratCardStructure) => {
    const { banker, player } = data;
    const newManualCards = [
      player.p1 || "",
      player.p2 || "",
      banker.b1 || "",
      banker.b2 || "",
      player.p3 || "",
      banker.b3 || "",
    ].filter((c) => c !== "");
    setManualCards(newManualCards);
    setPlayerCards([player.p2 ?? "back", player.p1 ?? "back"]);
    setBankerCards([banker.b2 ?? "back", banker.b1 ?? "back"]);
    setPlayerDraw(player.p3 ?? null);
    setBankerDraw(banker.b3 ?? null);
    const pTotal =
      (baccaratPoint(getRank(player.p1 || "")) +
        baccaratPoint(getRank(player.p2 || ""))) %
      10;
    const bTotal =
      (baccaratPoint(getRank(banker.b1 || "")) +
        baccaratPoint(getRank(banker.b2 || ""))) %
      10;

    if (banker.b3 || player.p3 || pTotal >= 8 || bTotal >= 8) {
      setIsFinished(true);
    }
  };

  /* ======================= DEAL + DRAW PROCESS ======================= */
  /** Appends selected card to manual sequence (Baccarat G) and updates display. */
  const handleSelectCard = (rankLabel?: string) => {
    if (!selectedSuit || !rankLabel) return;
    const rankMap: Record<string, string> = { A: "1" };
    const rank = rankMap[rankLabel] ?? rankLabel;
    const card = `${selectedSuit}${rank}`;
    setManualCards((prev) => {
      const next = [...prev];
      const targetIndex = getNextManualIndex(next);
      if (targetIndex === -1) {
        return prev;
      }
      next[targetIndex] = card;
      setPlayerCards([next[1] ?? "back", next[0] ?? "back"]);
      setBankerCards([next[3] ?? "back", next[2] ?? "back"]);
      setPlayerDraw(next[4] ?? null);
      setBankerDraw(next[5] ?? null);
      const pCards = [next[0], next[1]].filter(Boolean) as string[];
      const bCards = [next[2], next[3]].filter(Boolean) as string[];
      const pTotal =
        pCards.reduce((s, c) => s + baccaratPoint(getRank(c)), 0) % 10;
      const bTotal =
        bCards.reduce((s, c) => s + baccaratPoint(getRank(c)), 0) % 10;
      const hasP1 = !!next[0];
      const hasP2 = !!next[1];
      const hasB1 = !!next[2];
      const hasB2 = !!next[3];
      const hasP3 = !!next[4];
      const hasB3 = !!next[5];
      if (hasP1 && hasP2 && hasB1 && hasB2) {
        if (pTotal >= 8 || bTotal >= 8) {
          setIsFinished(true);
          return next;
        }
        /* -------- PLAYER DRAW DECISION -------- */
        const playerShouldDraw = shouldPlayerDraw(pTotal);
        if (!playerShouldDraw) {
          const bankerShouldDraw = shouldBankerDraw(bTotal, null);
          if (!bankerShouldDraw) {
            setIsFinished(true);
            return next;
          }
        }
      }
      /* -------- PLAYER 3RD CARD EXISTS -------- */
      if (hasP3 && !hasB3) {
        const p3Val = baccaratPoint(getRank(next[4]));
        const bankerShouldDraw = shouldBankerDraw(bTotal, p3Val);
        if (!bankerShouldDraw) {
          setIsFinished(true);
          return next;
        }
      }
      if (hasB3) {
        setIsFinished(true);
      }
      return next;
    });
  };
  /** Next slot index for Baccarat G manual deal (0–5 or -1 if full). */
  const getNextManualIndex = (cards: string[]) => {
    const [p1, p2, b1, b2, p3, b3] = cards;
    if (!p1) return 0;
    if (!p2) return 1;
    if (!b1) return 2;
    if (!b2) return 3;
    const pTotal =
      (baccaratPoint(getRank(p1)) + baccaratPoint(getRank(p2))) % 10;
    const bTotal =
      (baccaratPoint(getRank(b1)) + baccaratPoint(getRank(b2))) % 10;
    if (pTotal >= 8 || bTotal >= 8) return -1;
    /* ---------- PLAYER DRAW ---------- */
    if (!p3) {
      if (shouldPlayerDraw(pTotal)) {
        return 4;
      }
      if (shouldBankerDraw(bTotal, null)) {
        return 5;
      }
      return -1;
    }
    /* ---------- BANKER DRAW ---------- */
    if (!b3) {
      const p3Val = baccaratPoint(getRank(p3));
      if (shouldBankerDraw(bTotal, p3Val)) {
        return 5;
      }
      return -1;
    }
    return -1;
  };
  /** Removes last manually dealt card (Baccarat G). */
  const handleDeleteLastCard = () => {
    setIsFinished(false);
    setManualCards((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const lastIndex = [...next]
        .map((c, i) => (c ? i : -1))
        .filter((i) => i !== -1)
        .pop();
      if (lastIndex === undefined) return prev;
      next.splice(lastIndex, 1);
      setPlayerCards(["back", "back"]);
      setBankerCards(["back", "back"]);
      setPlayerDraw(null);
      setBankerDraw(null);
      next.forEach((card, index) => {
        if (!card) return;
        if (index === 0 || index === 1) {
          setPlayerCards((p) => (index === 0 ? ["back", card] : [card, p[1]]));
        } else if (index === 2 || index === 3) {
          setBankerCards((b) => (index === 2 ? ["back", card] : [card, b[1]]));
        } else if (index === 4) {
          setPlayerDraw(card);
        } else if (index === 5) {
          setBankerDraw(card);
        }
      });
      return next;
    });
  };
  /** Baccarat point value: 10/J/Q/K = 0, else numeric. */
  const baccaratPoint = (rank: string) => {
    if (["10", "J", "Q", "K"].includes(rank)) return 0;
    return Number(rank);
  };
  /** Card rank string (e.g. "1", "K"). */
  const getRank = (card: string) => {
    return card.slice(1);
  };
  /** Baccarat: player draws on total <= 5. */
  const shouldPlayerDraw = (pTotal: number) => pTotal <= 5;
  /** Baccarat: banker draw rules by total and player third card. */
  const shouldBankerDraw = (bTotal: number, p3: number | null) => {
    if (p3 === null) return bTotal <= 5;
    if (bTotal <= 2) return true;
    if (bTotal === 3 && p3 !== 8) return true;
    if (bTotal === 4 && p3 >= 2 && p3 <= 7) return true;
    if (bTotal === 5 && p3 >= 4 && p3 <= 7) return true;
    if (bTotal === 6 && p3 >= 6 && p3 <= 7) return true;
    return false;
  };
  /* -------------------------- CALCULATE RESULT -------------------------- */
  /** Builds result key from Baccarat G cards and opens confirm dialog. */
  const finishBaccaratRound = async () => {
    const pCards = manualCards.filter((_, i) => i === 0 || i === 1 || i === 4);
    const bCards = manualCards.filter((_, i) => i === 2 || i === 3 || i === 5);
    const pTotal =
      pCards.reduce((s, c) => s + baccaratPoint(getRank(c)), 0) % 10;
    const bTotal =
      bCards.reduce((s, c) => s + baccaratPoint(getRank(c)), 0) % 10;
    let finalResult = "";
    if (pTotal > bTotal) finalResult = "player";
    else if (bTotal > pTotal) finalResult = "banker";
    else finalResult = "tie";
    /* ------------ PAIRS ------------ */
    const playerPair = getRank(pCards[0]) === getRank(pCards[1]);
    const bankerPair = getRank(bCards[0]) === getRank(bCards[1]);
    /* ------------ ANY PAIR ------------ */
    const anyPair = playerPair || bankerPair;
    /* ------------ PERFECT PAIR (exact same rank + same suit) ------------ */
    const perfectPair = pCards[0] === pCards[1] || bCards[0] === bCards[1];
    /* ------------ BIG / SMALL ------------ */
    // Total cards on table
    const cardCount = pCards.length + bCards.length;
    let bigOrSmall = "";
    if (cardCount === 4) bigOrSmall = "small";
    else if (cardCount === 5 || cardCount === 6) bigOrSmall = "big";
    /* ------------ BUILD RESULT KEYS FOR API ------------ */
    const resultKeys: string[] = [];
    resultKeys.push(finalResult);
    if (playerPair) resultKeys.push("playerPair");
    if (bankerPair) resultKeys.push("bankerPair");
    if (anyPair) resultKeys.push("anyPair");
    if (perfectPair) resultKeys.push("perfectPair");
    if (bigOrSmall) resultKeys.push(bigOrSmall);
    const resultString = resultKeys.join("|");
    setManualCards([]);
    setSelectedSuit(null);
    setIsFinished(false);
    /* ------------ CREATE RESULT ------------ */
    if (!gameType || !deskNo || !gameSession || !gameRound) return;
    setSelectedResult({ key: resultString });
    setSelectedCards({
      player: {
        p1: manualCards[0] ?? null,
        p2: manualCards[1] ?? null,
        p3: manualCards[4] ?? null,
      },
      banker: {
        b1: manualCards[2] ?? null,
        b2: manualCards[3] ?? null,
        b3: manualCards[5] ?? null,
      },
    });
    setConfirmRecalculateDialogOpen(true);
  };

  // Longhu
  const [dragonCard, setDragonCard] = useState<string | null>(null);
  const [tigerCard, setTigerCard] = useState<string | null>(null);
  const [selectedLonghuSuit, setSelectedLonghuSuit] = useState<string | null>(
    null,
  );
  const [isLonghuFinished, setIsLonghuFinished] = useState(false);
  const SUIT_VALUE: Record<string, number> = {
    S: 4,
    H: 3,
    C: 2,
    D: 1,
  };
  const getCardSuitValue = (card: string) => {
    const suit = card[0];
    return SUIT_VALUE[suit] || 0;
  };
  /** Sets dragon or tiger card for Longhu. */
  const handleSelectLonghuCard = (rankLabel?: string) => {
    if (isLonghuFinished || !selectedLonghuSuit || !rankLabel) return;
    const rankMap: Record<string, string> = { A: "1" };
    const rank = rankMap[rankLabel] ?? rankLabel;
    const card = `${selectedLonghuSuit}${rank}`;
    if (!dragonCard) {
      setDragonCard(card);
    } else if (!tigerCard) {
      setTigerCard(card);
      setIsLonghuFinished(true);
    }
  };
  /** Clears tiger then dragon card for Longhu. */
  const handleDeleteLonghuLastCard = () => {
    if (tigerCard) {
      setTigerCard(null);
      setIsLonghuFinished(false);
      return;
    }
    if (dragonCard) {
      setDragonCard(null);
      setIsLonghuFinished(false);
      return;
    }
  };
  /** Finishes Longhu round (dragon vs tiger) and opens confirm. */
  const handleFinish = () => {
    if (dragonCard && tigerCard) {
      finishRound(dragonCard, tigerCard);
    }
  };
  /** Numeric rank for comparison (A=1, J=11, etc.). */
  const rankValue = (rank: string) => {
    if (rank === "A") return 1;
    if (rank === "J") return 11;
    if (rank === "Q") return 12;
    if (rank === "K") return 13;
    return Number(rank);
  };
  /** Builds Longhu result key and opens confirm dialog. */
  const finishRound = async (dragon: string, tiger: string) => {
    const dRank = rankValue(getRank(dragon));
    const tRank = rankValue(getRank(tiger));
    const dSuit = getCardSuitValue(dragon);
    const tSuit = getCardSuitValue(tiger);
    const resultParts: string[] = [];
    if (dRank > tRank) {
      resultParts.push("dragon");
    } else if (tRank > dRank) {
      resultParts.push("tiger");
    } else {
      if (dragon === tiger) {
        resultParts.push("tie");
      } else {
        if (dSuit > tSuit) {
          resultParts.push("dragon");
        } else {
          resultParts.push("tiger");
        }
      }
    }
    resultParts.push(dRank % 2 === 1 ? "dragonSingle" : "dragonDouble");
    resultParts.push(tRank % 2 === 1 ? "tigerSingle" : "tigerDouble");
    const resultString = resultParts.join("|");
    let mainResult = "tie";
    if (resultParts.includes("dragon")) mainResult = "dragon";
    if (resultParts.includes("tiger")) mainResult = "tiger";
    if (!gameType || !deskNo || !gameSession || !gameRound || !mainResult)
      return;
    setSelectedResult({ key: resultString });
    setSelectedCards({
      dragon,
      tiger,
    });
    setConfirmRecalculateDialogOpen(true);
  };

  // NiuNiu
  /* ---------------- CARD DISPLAY STATES ---------------- */
  const [cards, setCards] = useState<Record<Seat, string[]>>({
    banker: [],
    player1: [],
    player2: [],
    player3: [],
  });
  const [selectedNiuNiuSuit, setSelectedNiuNiuSuit] = useState<string | null>(
    null,
  );
  const [firstCard, setFirstCard] = useState<string | null>(null);
  const [dealOrder, setDealOrder] = useState<Seat[]>([]);
  const [dealPointer, setDealPointer] = useState(0);
  const [scannedCard, setScannedCard] = useState<string[]>([]);
  const isAllCardsDealt =
    cards.banker.length === 5 &&
    cards.player1.length === 5 &&
    cards.player2.length === 5 &&
    cards.player3.length === 5;
  /** True if hand has four of same rank (NiuNiu). */
  const isBomb = (hand: string[]) => {
    const count: Record<string, number> = {};
    hand.forEach((c) => {
      const rank = getRank(c);
      count[rank] = (count[rank] || 0) + 1;
    });
    return Object.values(count).includes(4);
  };
  /** True if all cards are J/Q/K (NiuNiu). */
  const isFiveFace = (hand: string[]) => {
    return hand.every((c) => ["J", "Q", "K"].includes(getRank(c)));
  };
  /** Returns hand type: bomb | fiveFace | niuNiu | niu | noNiu. */
  const getHandType = (hand: string[]) => {
    if (isBomb(hand)) return "bomb";
    if (isFiveFace(hand)) return "fiveFace";
    const niu = calcNiu(hand);
    if (niu === 10) return "niuNiu";
    if (niu > 0) return "niu";
    return "noNiu";
  };

  /** Loads NiuNiu round cards into first card, deal order, and seat cards. */
  const loadCardsFromRound = (roundData?: GameRound) => {
    if (!roundData?.cards) return;
    const c = roundData?.cards;
    if (!c || !("first_card" in c)) return;
    const niuCards = c as NiuniuCardStructure;
    setFirstCard(niuCards.first_card);
    const order = getDealOrderByRank(getCardRankValue(niuCards.first_card));
    setDealOrder(order);
    const reconstructedScanned: string[] = [niuCards.first_card];
    let pointerCount = 0;
    for (let i = 0; i < 5; i++) {
      order.forEach((seat) => {
        const seatCards = niuCards[seat as keyof NiuniuCardStructure];
        if (Array.isArray(seatCards)) {
          const card = seatCards[i];
          if (card) {
            reconstructedScanned.push(card);
            pointerCount++;
          }
        }
      });
    }
    setScannedCard(reconstructedScanned);
    setDealPointer(pointerCount);
    setCards({
      banker: Array.isArray(c.banker) ? c.banker : [],
      player1: c.player1 ?? [],
      player2: c.player2 ?? [],
      player3: c.player3 ?? [],
    });
  };

  /** Deals next card to NiuNiu seat by deal order. */
  const handleSelectNiuNiuCard = (rankLabel?: string) => {
    if (!selectedNiuNiuSuit) return;
    const rankMap: Record<string, string> = {
      A: "1",
      J: "J",
      Q: "Q",
      K: "K",
    };
    if (!rankLabel) return;
    const rank = rankMap[rankLabel] ?? rankLabel;
    const rankValue = RANK_VALUE[rankLabel] ?? rankLabel;
    const card = `${selectedNiuNiuSuit}${rank}`;
    if (scannedCard.includes(card)) {
      return;
    }
    setScannedCard((prev) => [...prev, card]);
    if (!firstCard) {
      setFirstCard(card);
      setDealOrder(getDealOrderByRank(Number(rankValue)));
      return;
    }
    if (dealPointer >= 20) return;
    const seat = dealOrder[dealPointer % 4];
    setCards((prev) => ({
      ...prev,
      [seat]: [...prev[seat], card],
    }));
    setDealPointer((p) => p + 1);
  };
  const nextDealSeat =
    firstCard && dealPointer < 20 ? dealOrder[dealPointer % 4] : null;
  const nextCardIndex = Math.floor(dealPointer / 4);
  /** Undoes last NiuNiu card deal. */
  const handleDeleteNiuNiuLastCard = () => {
    if (dealPointer === 0) return;
    const prevPointer = dealPointer - 1;
    const seat = dealOrder[prevPointer % 4];
    setCards((prev) => {
      const newSeatCards = [...prev[seat]];
      newSeatCards.pop();
      return {
        ...prev,
        [seat]: newSeatCards,
      };
    });
    setScannedCard((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
    setDealPointer(prevPointer);
  };

  /** NiuNiu point: J/Q/K = 10, A = 1, else number. */
  const niuPoint = (rank: string) => {
    if (["J", "Q", "K"].includes(rank)) return 10;
    if (rank === "1") return 1;
    return Number(rank);
  };
  /* -------------------------- CALCULATE RESULT -------------------------- */
  /** Niu value 0–10 for NiuNiu hand (three cards sum to multiple of 10). */
  const calcNiu = (hand: string[]) => {
    const values = hand.map((c) => niuPoint(getRank(c)));
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 4; j++) {
        for (let k = j + 1; k < 5; k++) {
          const sum3 = values[i] + values[j] + values[k];
          if (sum3 % 10 === 0) {
            const rest = values.reduce((a, b) => a + b, 0) - sum3;
            const niu = rest % 10;
            return niu === 0 ? 10 : niu;
          }
        }
      }
    }
    return 0;
  };

  /** Returns "player" or "banker" winner for NiuNiu comparison. */
  const compareHands = (
    bankerCards: string[],
    playerCards: string[],
    bankerNiu: number,
    playerNiu: number,
  ) => {
    const bankerType = getHandType(bankerCards);
    const playerType = getHandType(playerCards);
    if (HAND_TYPE_RANK[playerType] !== HAND_TYPE_RANK[bankerType]) {
      return HAND_TYPE_RANK[playerType] > HAND_TYPE_RANK[bankerType]
        ? "player"
        : "banker";
    }
    if (bankerType === "niu" || bankerType === "niuNiu") {
      if (playerNiu !== bankerNiu) {
        return playerNiu > bankerNiu ? "player" : "banker";
      }
    }
    const bankerMax = getMaxCard(bankerCards);
    const playerMax = getMaxCard(playerCards);
    const rankDiff = getCardRankValue(playerMax) - getCardRankValue(bankerMax);
    if (rankDiff !== 0) return rankDiff > 0 ? "player" : "banker";
    return getCardSuitValue(playerMax) > getCardSuitValue(bankerMax)
      ? "player"
      : "banker";
  };

  /** Hand text and win flag for a NiuNiu seat. */
  const getSeatResult = (seat: Seat) => {
    if (!isAllCardsDealt) return null;
    const bankerCards = cards.banker;
    const bankerNiu = calcNiu(bankerCards);
    if (seat === "banker") {
      return {
        text: formatHandText(bankerCards),
        win: false,
      };
    }
    const playerCards = cards[seat];
    const playerNiu = calcNiu(playerCards);
    const winner = compareHands(bankerCards, playerCards, bankerNiu, playerNiu);
    return {
      text: formatHandText(playerCards),
      win: winner === "player",
    };
  };
  /** Human-readable hand type (e.g. 牛牛, 无牛). */
  const formatHandText = (hand: string[]) => {
    if (isBomb(hand)) return "炸弹";
    if (isFiveFace(hand)) return "5公";
    const niu = calcNiu(hand);
    if (niu === 10) return "牛牛";
    if (niu === 0) return "无牛";
    return `牛 ${niu}`;
  };
  /** Submits NiuNiu recalculate (recalculateResult + recalculateNiuniuResult). */
  const finishNiuNiuRound = async () => {
    if (!gameRound) return;
    const selectNiuNiuCards = {
      first_card: firstCard,
      banker: cards.banker,
      player1: cards.player1,
      player2: cards.player2,
      player3: cards.player3,
    };
    const areValuesIdentical = (a: Card, b: Card) => {
      const normalize = (obj: Card) => {
        if (!obj) return null;
        return {
          first_card: obj.first_card,
          banker: obj.banker,
          player1: obj.player1,
          player2: obj.player2,
          player3: obj.player3,
        };
      };
      const current = normalize(a);
      const original = normalize(b);
      return JSON.stringify(current) === JSON.stringify(original);
    };
    if (initialCards && selectNiuNiuCards) {
      if (areValuesIdentical(initialCards, selectNiuNiuCards)) {
        setErrorMessage("Result is Same");
        setErrorDialogOpen(true);
        return;
      }
    }
    setIsLoading(true);
    const bankerHandType = getHandType(cards.banker);
    const bankerNiu = calcNiu(cards.banker);
    const resultKeys: string[] = [];
    (["player1", "player2", "player3"] as Seat[]).forEach((seat, idx) => {
      const playerCards = cards[seat];
      const playerNiu = calcNiu(playerCards);
      const winner = compareHands(
        cards.banker,
        playerCards,
        bankerNiu,
        playerNiu,
      );
      if (winner === "banker") {
        resultKeys.push(`banker${idx + 1}Even`);
        resultKeys.push(`banker${idx + 1}Double`);
      } else {
        resultKeys.push(`${seat}Even`);
        resultKeys.push(`${seat}Double`);
      }
    });
    const resultString = resultKeys.join("|");

    try {
      const data = await recalculateResult({
        round_id: Number(gameRound),
        game_id: Number(gameType),
        baccarat_type: null,
        result: resultString,
        niu_value: {
          banker: bankerNiu,
          player1: calcNiu(cards.player1),
          player2: calcNiu(cards.player2),
          player3: calcNiu(cards.player3),
        },
        cards: selectNiuNiuCards,
      });

      await recalculateNiuniuResult({
        round_id: Number(gameRound),
        banker_cards: cards.banker,
        banker_niu_value: bankerNiu,
        banker_hand_type: bankerHandType,
        banker_multiplier: 1,
        players: (["player1", "player2", "player3"] as const).map((seat) => {
          const playerCards = cards[seat];
          const playerNiu = calcNiu(playerCards);
          const win =
            compareHands(cards.banker, playerCards, bankerNiu, playerNiu) ===
            "player";
          return {
            position: seat,
            cards: playerCards,
            niu_value: playerNiu,
            hand_type: getHandType(playerCards),
            result: win ? "win" : "lose",
            multiplier: 1,
          };
        }),
      });
      setIsLoading(false);

      if (data.success) {
        setCards({
          banker: [],
          player1: [],
          player2: [],
          player3: [],
        });
        setFirstCard(null);
        setDealOrder([]);
        setDealPointer(0);
        setSelectedNiuNiuSuit(null);
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };

  /** Resets all card/result state for Baccarat G and Longhu. */
  const clearRecalculateValue = () => {
    setPlayerCards(["back", "back"]);
    setBankerCards(["back", "back"]);
    setPlayerDraw(null);
    setBankerDraw(null);
    setSelectedResult(null);
    setSelectedSuit(null);
    setDragonCard(null);
    setTigerCard(null);
    setIsLonghuFinished(false);
    setSelectedLonghuSuit(null);
  };
  clearRecalculateValueRef.current = clearRecalculateValue;

  return (
    <>
      <div className="flex md:flex-row md:justify-start flex-wrap items-center gap-2">
        <DateTimePicker
          value={startDate || undefined}
          onChange={(date) => {
            setStartDate(date);
            searchGameSessions(Number(deskNo), date, endDate);
          }}
          dateLabel={""}
          timeLabel={""}
          className=""
        />
        <span className="date-separator text-sm">~</span>
        <DateTimePicker
          value={endDate || undefined}
          onChange={(date) => {
            setEndDate(date);
            searchGameSessions(Number(deskNo), startDate, date);
          }}
          dateLabel={""}
          timeLabel={""}
          className=""
        />
      </div>

      <div className="xl:grid-cols-4 grid lg:grid-cols-2 gap-y-3 gap-x-8 mt-2">
        <SelectField
          id="game_id"
          label={t("rc_game_type")}
          required={true}
          value={gameType}
          labelWidth={dynamicLabelWidth}
          selectClassName="w-70 lg:w-full"
          onChange={(newValue) => {
            setGameType(newValue);
            const selectedGame = games.find((g) => g.id == Number(newValue));
            if (selectedGame?.type === "BACCARAT") {
              setBaccaratType("N");
              searchDesks(Number(newValue), "N");
            } else {
              setBaccaratType("");
              searchDesks(Number(newValue), "");
            }
          }}
          options={games.map((d) => ({
            value: String(d.id),
            label:
              d.type === "NIUNIU"
                ? t("cl_niuniu")
                : d.type === "BACCARAT"
                  ? t("cl_baccarat")
                  : d.type === "LONGHU"
                    ? t("cl_dragon_tiger")
                    : d.name,
          }))}
          selectWidth="w-full"
        />
        {(() => {
          const selectedGame = games.find((g) => g.id == Number(gameType));
          if (selectedGame?.type === "BACCARAT") {
            return (
              <SelectField
                id="baccarat_type"
                label={t("rc_baccarat_type")}
                required={true}
                labelWidth={dynamicLabelWidth}
                selectClassName="w-70 lg:w-full"
                value={baccaratType}
                onChange={(newValue) => {
                  setBaccaratType(newValue);
                  searchDesks(Number(gameType), newValue);
                }}
                options={[
                  { value: "N", label: "N" },
                  { value: "G", label: "G" },
                  { value: "B", label: "B" },
                ]}
              />
            );
          }
          return null;
        })()}
        <SelectField
          id="desk_id"
          label={t("rc_table_no")}
          required={false}
          value={deskNo}
          labelWidth={dynamicLabelWidth}
          selectClassName="w-70 lg:w-full"
          onChange={(newValue) => {
            setDeskNo(newValue);
            searchGameSessions(Number(newValue), startDate, endDate);
          }}
          options={desks.map((d) => ({
            value: String(d.id),
            label: d.name,
          }))}
          selectWidth="w-full"
        />
        <SelectField
          id="game_session"
          label={t("rc_game_sessions")}
          required={true}
          value={gameSession}
          labelWidth={dynamicLabelWidth}
          selectClassName="w-70 lg:w-full"
          onChange={(newValue) => {
            setGameSession(newValue);
            searchGameRounds(Number(newValue), startDate, endDate);
          }}
          options={gameSessions.map((d) => ({
            value: String(d.id),
            label: String(d.session_no),
          }))}
          selectWidth="w-full"
        />
        <SelectField
          id="game_round"
          label={t("rc_game_rounds")}
          required={true}
          value={gameRound}
          labelWidth={dynamicLabelWidth}
          selectClassName="w-70 lg:w-full"
          onChange={(newValue) => {
            setGameRound(newValue);
          }}
          options={gameRounds.map((d) => ({
            value: String(d.id),
            label: String(d.round_no),
          }))}
          selectWidth="w-full"
        />
      </div>
      {gameType !== "" &&
        deskNo !== "" &&
        gameSession !== "" &&
        gameRound !== "" &&
        (baccaratType === "N" || baccaratType === "B") && (
          <div className="border-t mt-3 mb-1">
            <Label className="block font-bold">
              {t("rc_previous_round_results")}
            </Label>
            <div className="flex flex-wrap gap-4 bg-white rounded-md">
              {results.map((result) => {
                const compositeKey = `${result.id}`;
                return (
                  <div
                    key={compositeKey}
                    className="flex items-center gap-3 px-3 py-2 border rounded hover:bg-gray-50 transition-colors"
                  >
                    <CheckboxField
                      id={`checkbox-${compositeKey}`}
                      checked={!!selectedCheckboxes[compositeKey]}
                      disabled
                      onCheckedChange={(checked) =>
                        setSelectedCheckboxes((prev) => ({
                          ...prev,
                          [compositeKey]: Boolean(checked),
                        }))
                      }
                    />
                    <Label
                      htmlFor={`checkbox-${compositeKey}`}
                      className="text-sm font-medium"
                    >
                      {isEn ? result.key : result.name}
                    </Label>
                  </div>
                );
              })}
              {results.length === 0 && (
                <span className="text-gray-400 italic">
                  No results found for selection.
                </span>
              )}
            </div>
          </div>
        )}
      {gameType !== "" &&
        deskNo !== "" &&
        gameSession !== "" &&
        gameRound !== "" &&
        baccaratType === "N" && (
          <div className="lg:w-120 md:w-100 sm:w-90 mt-3">
            <div className="grid grid-cols-5 gap-2">
              {showNResults.map((result, i) => {
                const firstKey = result.key.split("|")[0];
                return (
                  <Button
                    key={i}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      "flex flex-col h-18 lg:h-20 items-center justify-center p-2 text-white",
                      "font-bold shadow-md cursor-pointer transition-colors duration-200 rounded-lg",
                      firstKey === "banker" && "bg-red-600 hover:bg-red-500",
                      firstKey === "supertwoSix" &&
                        "bg-red-600 hover:bg-red-500",
                      firstKey === "superthreeSix" &&
                        "bg-red-600 hover:bg-red-500",
                      firstKey === "player" && "bg-blue-600 hover:bg-blue-500",
                      firstKey === "tie" && "bg-green-600 hover:bg-green-500",
                    )}
                  >
                    {result.name.includes("|") ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-md leading-tight">
                          {result.name.split("|")[0]}
                        </span>
                        <span className="text-sm opacity-90">
                          {result.name.split("|")[1]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-md">{result.name}</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      {gameType !== "" &&
        deskNo !== "" &&
        gameSession !== "" &&
        gameRound !== "" &&
        baccaratType === "B" && (
          <div className="lg:w-120 md:w-100 sm:w-90 mt-3">
            <div className="grid grid-cols-3 gap-2">
              {showBResults.map((result, i) => {
                const firstKey = result.key.split("|")[0];
                return (
                  <Button
                    key={i}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      "flex flex-col h-18 lg:h-20 items-center justify-center p-2 text-white",
                      "font-bold shadow-md cursor-pointer transition-colors duration-200 rounded-lg",
                      firstKey === "banker" && "bg-red-600 hover:bg-red-500",
                      firstKey === "player" && "bg-blue-600 hover:bg-blue-500",
                      firstKey === "tie" && "bg-green-600 hover:bg-green-500",
                    )}
                  >
                    {result.name.includes("|") ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-md leading-tight">
                          {result.name.split("|")[0]}
                        </span>
                        <span className="text-sm opacity-90">
                          {result.name.split("|")[1]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-md">{result.name}</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      {gameType !== "" &&
        deskNo !== "" &&
        gameSession !== "" &&
        gameRound !== "" &&
        baccaratType === "G" && (
          <div className="mt-3 border-t">
            <div className="flex justify-center sm:gap-18 gap-3 sm:p-3 p-0 mb-2">
              {/* BANKER */}
              <div className="flex sm:gap-4 gap-1">
                <div className="flex items-center justify-center sm:w-14 sm:h-14 w-8 h-8 rounded-full border-2 border-red-600 text-red-600 font-bold sm:text-2xl text-sm">
                  庄
                </div>
                <div className="flex flex-col sm:gap-3 gap-3">
                  <div className="flex sm:gap-3 gap-1">
                    {bankerCards.map((c, i) => (
                      <img
                        key={i}
                        src={
                          c === "back"
                            ? "/images/cards/back.jpg"
                            : `/images/cards/${c}.jpg`
                        }
                        className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                      />
                    ))}
                  </div>
                  <div className="flex justify-center">
                    {bankerDraw ? (
                      <img
                        src={`/images/cards/${bankerDraw}.jpg`}
                        className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                      />
                    ) : (
                      <img
                        src={`/images/cards/back.jpg`}
                        className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                      />
                    )}
                  </div>
                </div>
              </div>
              {/* PLAYER */}
              <div className="flex sm:gap-4 gap-1">
                <div className="flex flex-col sm:gap-3 gap-3">
                  <div className="flex sm:gap-3 gap-1">
                    {playerCards.map((c, i) => (
                      <img
                        key={i}
                        src={
                          c === "back"
                            ? "/images/cards/back.jpg"
                            : `/images/cards/${c}.jpg`
                        }
                        className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                      />
                    ))}
                  </div>
                  <div className="flex justify-center">
                    {playerDraw ? (
                      <img
                        src={`/images/cards/${playerDraw}.jpg`}
                        className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                      />
                    ) : (
                      <img
                        src={`/images/cards/back.jpg`}
                        className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center sm:w-14 sm:h-14 w-8 h-8 rounded-full border-2 border-blue-600 text-blue-600 font-bold sm:text-2xl text-xs">
                  闲
                </div>
              </div>
            </div>
            <AdminCardInputPanel
              selectedSuit={selectedSuit}
              status={manualCards.length > 0 ? "dealing" : "betting"}
              onSuit={setSelectedSuit}
              onRank={handleSelectCard}
              onDelete={handleDeleteLastCard}
              canFinish={isFinished}
              onFinish={finishBaccaratRound}
            />
          </div>
        )}
      {gameType !== "" &&
        deskNo !== "" &&
        gameSession !== "" &&
        gameRound !== "" &&
        games.find((g) => g.id == Number(gameType))?.type === "LONGHU" && (
          <div className="border-t mt-3">
            <div className=" flex items-center justify-center gap-10 md:gap-15 lg:gap-30 my-3">
              <div className="flex gap-6 items-center">
                <div className="flex items-center justify-center sm:w-14 sm:h-14 w-8 h-8 rounded-full border-2 md:border-4 border-red-600 text-red-600 font-bold sm:text-2xl text-lg">
                  龙
                </div>
                <div className="flex gap-6">
                  {dragonCard ? (
                    <img
                      src={`/images/cards/${dragonCard}.jpg`}
                      className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                    />
                  ) : (
                    <img
                      src={`/images/cards/back.jpg`}
                      className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                    />
                  )}
                </div>
              </div>
              <div className="flex gap-6 items-center">
                <div className="flex gap-6">
                  {tigerCard ? (
                    <img
                      src={`/images/cards/${tigerCard}.jpg`}
                      className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                    />
                  ) : (
                    <img
                      src={`/images/cards/back.jpg`}
                      className="sm:w-30 w-13 sm:rounded-xl rounded-md border border-black"
                    />
                  )}
                </div>
                <div className="flex items-center justify-center sm:w-14 sm:h-14 w-8 h-8 rounded-full border-2 md:border-4 border-blue-600 text-blue-600 font-bold sm:text-2xl text-sm">
                  虎
                </div>
              </div>
            </div>
            <AdminCardInputPanel
              selectedSuit={selectedLonghuSuit}
              status={dragonCard ? "dealing" : "betting"}
              onSuit={setSelectedLonghuSuit}
              onRank={handleSelectLonghuCard}
              onDelete={handleDeleteLonghuLastCard}
              canFinish={isLonghuFinished}
              onFinish={handleFinish}
            />
          </div>
        )}
      {gameType !== "" &&
        deskNo !== "" &&
        gameSession !== "" &&
        gameRound !== "" &&
        games.find((g) => g.id == Number(gameType))?.type === "NIUNIU" && (
          <div className="border-t mt-3 flex flex-col justify-center">
            <div className="flex flex-col mx-auto justify-center my-2 md:my-1 p-3 gap-4">
              <div className="flex flex-col lg:flex-row gap-1 md:gap-1 lg:gap-7">
                <div className="w-24">
                  <img
                    src={
                      firstCard
                        ? `/images/cards/${firstCard}.jpg`
                        : "/images/cards/arrow.jpg"
                    }
                    className="w-12 sm:w-14 md:w-20 lg:w-[80px] rounded-lg border border-black transition-all duration-300 ease-in-out"
                  />
                </div>
                <div className="w-full">
                  {(["banker", "player1", "player2", "player3"] as Seat[]).map(
                    (seat) => (
                      <div
                        key={seat}
                        className="flex flex-col lg:flex-row items-center sm:gap-2 md:gap-3 lg:gap- gap-0 mb-3 justify-between"
                      >
                        <div className="flex items-center gap-2 md:gap-4 lg:gap-5">
                          <div className="text-lg lg:text-3xl md:text-xl sm:text-lg text-blue-700 font-bold">
                            {seat === "banker" ? "庄　" : `闲${RESULT[seat]} `}
                          </div>
                          <div className="w-25">
                            {isAllCardsDealt &&
                              (() => {
                                const result = getSeatResult(seat);
                                if (!result) return null;
                                return (
                                  <div className="text-md lg:text-2xl md:text-lg sm:text-md text-black font-bold">
                                    {result.win && seat !== "banker" && "赢 "}
                                    {result.text}
                                  </div>
                                );
                              })()}
                          </div>
                        </div>
                        <div className="flex gap-1 md:gap-2 lg:gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <img
                              key={i}
                              src={
                                cards[seat][i]
                                  ? `/images/cards/${cards[seat][i]}.jpg`
                                  : nextDealSeat === seat && i === nextCardIndex
                                    ? "/images/cards/arrow.jpg"
                                    : "/images/cards/back.jpg"
                              }
                              className="w-12 sm:w-14 md:w-20 lg:w-[80px] rounded-lg border border-black transition-all duration-300 ease-in-out"
                            />
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
            <AdminCardInputPanel
              selectedSuit={selectedNiuNiuSuit}
              status={firstCard ? "dealing" : "betting"}
              onSuit={setSelectedNiuNiuSuit}
              onRank={handleSelectNiuNiuCard}
              onDelete={handleDeleteNiuNiuLastCard}
              canFinish={isAllCardsDealt}
              onFinish={finishNiuNiuRound}
            />
          </div>
        )}
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
          searchResults();
          clearRecalculateValue();
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
      <ConfirmDialog
        open={successDialogOpen}
        onClose={() => {
          setSuccessDialogOpen(false);
          searchResults();
          clearRecalculateValue();
        }}
        status="success"
        message={t("rc_success_modify")}
      />
      {selectedResult && !isLoading && (
        <ConfirmRecalculateDialog
          open={confirmRecalculateDialogOpen}
          onConfirm={confirmResult}
          onCancel={() => {
            setConfirmRecalculateDialogOpen(false);
            clearRecalculateValue();
          }}
          result={selectedResult}
        />
      )}
    </>
  );
};

export default Recalculate;
