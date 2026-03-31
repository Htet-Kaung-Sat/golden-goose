import { getSocket } from "@/lib/socket";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

interface CardState {
  dragon?: string | null;
  tiger?: string | null;
  player?: {
    p1?: string | null;
    p2?: string | null;
    p3?: string | null;
  };
  banker?: {
    b1?: string | null;
    b2?: string | null;
    b3?: string | null;
  };
}

interface DealCardPayload {
  dragon?: string | null;
  tiger?: string | null;
  cards?: {
    player?: {
      p1?: string | null;
      p2?: string | null;
      p3?: string | null;
    };
    banker?: {
      b1?: string | null;
      b2?: string | null;
      b3?: string | null;
    };
  };
}

interface DeleteLastCardPayload {
  position?: string;
}

interface CardBoardContextType {
  cardState: Record<number, CardState>;
  setCardState: (deskId: number, cards: CardState) => void;
  clearDeskCardsAfterDelay: (deskId: number, delayMs?: number) => void;
}

const CardBoardContext = createContext<CardBoardContextType>({
  cardState: {},
  setCardState: () => {},
  clearDeskCardsAfterDelay: () => {},
});

export const CardBoardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cardState, setCardState] = useState<Record<number, CardState>>({});

  const updateCardState = (deskId: number, cards: CardState) => {
    setCardState((prevState) => ({
      ...prevState,
      [deskId]: { ...prevState[deskId], ...cards },
    }));
  };

  const clearDeskCardsAfterDelay = useCallback(
    (deskId: number, delayMs: number = 5000) => {
      setTimeout(() => {
        setCardState((prevState) => {
          const newState = { ...prevState };
          delete newState[deskId];
          return newState;
        });
      }, delayMs);
    },
    [],
  );

  useEffect(() => {
    const socket = getSocket();

    const handleDealCard = (event: string, payload: DealCardPayload) => {
      const deskId = parseInt(event.split(":")[1], 10);
      if (isNaN(deskId)) return;

      const { cards, dragon, tiger } = payload;

      if (cards) {
        updateCardState(deskId, {
          player: cards.player,
          banker: cards.banker,
        });
      } else {
        updateCardState(deskId, {
          dragon,
          tiger,
        });
      }
    };

    const handleUpdateResult = (event: string) => {
      const deskId = parseInt(event.split(":")[1], 10);
      if (!isNaN(deskId)) {
        setTimeout(() => {
          setCardState((prevState) => {
            const newState = { ...prevState };
            delete newState[deskId];
            return newState;
          });
        }, 5000);
      }
    };

    const handleDeleteLastCard = (
      event: string,
      payload: DeleteLastCardPayload,
    ) => {
      const deskId = parseInt(event.split(":")[1], 10);
      if (isNaN(deskId)) return;

      const { position } = payload;
      if (!position) return;

      setCardState((prevState) => {
        const currentDeskState = prevState[deskId];
        if (!currentDeskState) return prevState;

        const newState = { ...prevState };

        if (position.startsWith("p") && currentDeskState.player) {
          newState[deskId] = {
            ...currentDeskState,
            player: {
              ...currentDeskState.player,
              [position]: null,
            },
          };
        } else if (position.startsWith("b") && currentDeskState.banker) {
          newState[deskId] = {
            ...currentDeskState,
            banker: {
              ...currentDeskState.banker,
              [position]: null,
            },
          };
        }

        return newState;
      });
    };

    socket.onAny((event, payload) => {
      if (event.endsWith(":dealCard")) {
        handleDealCard(event, payload);
      } else if (event.endsWith(":updateResult")) {
        handleUpdateResult(event);
      } else if (event.endsWith(":deleteLastCard")) {
        handleDeleteLastCard(event, payload);
      }
    });

    return () => {
      socket.offAny();
    };
  }, []);

  return (
    <CardBoardContext.Provider
      value={{
        cardState,
        setCardState: updateCardState,
        clearDeskCardsAfterDelay,
      }}
    >
      {children}
    </CardBoardContext.Provider>
  );
};

export const useCardBoardContext = () => useContext(CardBoardContext);
