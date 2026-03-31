import API from "../axios";
export const recalculateResult = async (payload: {
  round_id: number;
  result: string;
  game_id: number;
  baccarat_type: string | null;
  niu_value?: {
    banker: number;
    player1: number;
    player2: number;
    player3: number;
  };
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
}) => {
  const { data } = await API.post(
    "/admin/recalculates/recalculate_result",
    payload,
  );
  return data;
};

export const recalculateNiuniuResult = async (payload: {
  round_id: number;
  banker_cards: string[];
  banker_niu_value: number;
  banker_hand_type: string;
  banker_multiplier: number;
  players: {
    position: "player1" | "player2" | "player3";
    cards: string[];
    niu_value: number;
    hand_type: string;
    result: "win" | "lose";
    multiplier: number;
  }[];
}): Promise<Response> => {
  const { data } = await API.post(
    "/admin/recalculates/recalculate_niuniu_result",
    payload,
  );
  return data;
};
