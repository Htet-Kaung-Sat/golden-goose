import { getSocket } from "@/lib/socket";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Seat = "banker" | "player1" | "player2" | "player3";

type NiuniuCards = Record<Seat, string[]>;

interface NiuniuCardState {
  firstCard: string | null;
  cards: NiuniuCards;
}

interface NiuniuCardBoardContextType {
  cardState: Record<number, NiuniuCardState>;
  clearDeskCardsAfterDelay: (deskId: number, delayMs?: number) => void;
}

interface DealCardPayload {
  firstCard?: string | null;
  cards?: NiuniuCards;
}

interface DeleteLastCardPayload {
  seat?: Seat;
}

const emptyCards: NiuniuCards = {
  banker: [],
  player1: [],
  player2: [],
  player3: [],
};

const NiuniuCardBoardContext = createContext<NiuniuCardBoardContextType>(
  {} as NiuniuCardBoardContextType,
);

export const NiuniuCardBoardProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [cardState, setCardState] = useState<Record<number, NiuniuCardState>>(
    {},
  );

  const clearDeskCardsAfterDelay = useCallback(
    (deskId: number, delayMs: number = 5000) => {
      setTimeout(() => {
        setCardState((prevState) => {
          const next = { ...prevState };
          delete next[deskId];
          return next;
        });
      }, delayMs);
    },
    [],
  );

  const updateDeskState = (deskId: number, nextState: NiuniuCardState) => {
    setCardState((prevState) => ({
      ...prevState,
      [deskId]: nextState,
    }));
  };

  useEffect(() => {
    const socket = getSocket();

    const handleDealCard = (event: string, payload: DealCardPayload) => {
      const deskId = parseInt(event.split(":")[1], 10);
      if (isNaN(deskId)) return;

      updateDeskState(deskId, {
        firstCard: payload.firstCard ?? null,
        cards: payload.cards ?? emptyCards,
      });
    };

    const handleDeleteLastCard = (
      event: string,
      payload: DeleteLastCardPayload,
    ) => {
      const deskId = parseInt(event.split(":")[1], 10);
      if (isNaN(deskId)) return;

      const seat = payload?.seat;
      if (!seat) return;

      setCardState((prevState) => {
        const current = prevState[deskId] ?? {
          firstCard: null,
          cards: emptyCards,
        };

        const nextCards = {
          ...current.cards,
          [seat]: current.cards[seat]?.slice(0, -1) ?? [],
        };

        return {
          ...prevState,
          [deskId]: {
            ...current,
            cards: nextCards,
          },
        };
      });
    };

    const handleInvalidGame = (event: string) => {
      const deskId = parseInt(event.split(":")[1], 10);
      if (isNaN(deskId)) return;

      clearDeskCardsAfterDelay(deskId, 0);
    };

    const handleUpdateResult = (event: string) => {
      const deskId = parseInt(event.split(":")[1], 10);
      if (isNaN(deskId)) return;

      clearDeskCardsAfterDelay(deskId, 5000);
    };

    socket.onAny((event, payload) => {
      if (event.endsWith(":dealCard")) {
        handleDealCard(event, payload);
      } else if (event.endsWith(":deleteLastCard")) {
        handleDeleteLastCard(event, payload);
      } else if (event.endsWith(":invalid-game")) {
        handleInvalidGame(event);
      } else if (event.endsWith(":updateResult")) {
        handleUpdateResult(event);
      }
    });

    return () => {
      socket.offAny();
    };
  }, [clearDeskCardsAfterDelay]);

  return (
    <NiuniuCardBoardContext.Provider
      value={{ cardState, clearDeskCardsAfterDelay }}
    >
      {children}
    </NiuniuCardBoardContext.Provider>
  );
};

export const useNiuniuCardBoardContext = () =>
  useContext(NiuniuCardBoardContext);
