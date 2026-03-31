export type GameRound = {
  id: number;
  session_id: number;
  round_no: number;
  status: string;
  cards?: {
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
  };
  createdAt: Date;
  updatedAt: Date;
};
