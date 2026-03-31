import { Desk, Response } from "@/types";
import API from "../axios";

export const getDesk = async (id: number): Promise<Desk> => {
  const { data } = await API.get(`/operator/desks/${id}`);
  return data.data.desk;
};

export const getGameInfos = async (id: number): Promise<Response> => {
  const { data } = await API.get(`/operator/game_infos/${id}`);
  return data;
};

export const createResult = async (payload: {
  round_id: number;
  result: string;
  game_id: number;
  baccarat_type: string | null;
  niu_value?: {
    banker_hand_type: string;
    banker: number;
    player1: number;
    player2: number;
    player3: number;
    hand_type1: string;
    hand_type2: string;
    hand_type3: string;
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
  const { data } = await API.post("/operator/results", payload);
  return data;
};

export const createNiuniuResult = async (payload: {
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
  const { data } = await API.post("/operator/niuniu_results", payload);
  return data;
};

export const updateGameRound = async (
  id: number,
  payload: {
    status: string;
  },
) => {
  const { data } = await API.put(`/operator/game_rounds/${id}`, payload);
  return data;
};

export const finishGameSession = async (
  desk_id: number,
  payload: {
    moper?: string;
    hander?: string;
    monitor?: string;
    cutter?: string;
    shuffle_type?: string;
    card_color?: string;
  },
): Promise<Response> => {
  const { data } = await API.post(
    `/operator/finish_game_session/${desk_id}`,
    payload,
  );
  return data;
};

export const invalidGame = async (payload: {
  round_id: number;
}): Promise<Response> => {
  const { data } = await API.post("/operator/invalid_game", payload);
  return data;
};

export const confirmAccount = async (payload: {
  account: string;
  password: string;
  desk_id: number;
}) => {
  const { data } = await API.post("/operator/confirm_account", payload);
  return data;
};
