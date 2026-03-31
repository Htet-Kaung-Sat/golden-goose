import { Response } from "@/types";
import API from "../axios";
import { User } from "@/types/User";

export const getGames = async (): Promise<Response> => {
  const { data } = await API.get("/user/games");
  return data;
};

export const getDesks = async (): Promise<Response> => {
  const { data } = await API.get("/user/desks");
  return data;
};

export const getCameras = async (): Promise<Response> => {
  const { data } = await API.get("/user/cameras");
  return data;
};

export const getUser = async (id: number): Promise<User> => {
  const { data } = await API.get(`/user/users/${id}`);
  return data.data.user;
};

export const getProfile = async (): Promise<{ user: User }> => {
  const { data } = await API.get("/user/profile");
  return data.data;
};

/** Latest user-facing announcement (member route; does not use admin API). */
export const getAnnouncements = async (): Promise<Response> => {
  const { data } = await API.get("/user/announce");
  return data;
};

export const changePassword = async (payload: {
  new_password: string;
}): Promise<void> => {
  await API.put("/user/change_password", payload);
};

export const getResultsByDesk = async (desk_id: number): Promise<Response> => {
  const { data } = await API.get(`/user/results_by_desk/${desk_id}`);
  return data;
};
export const getLastRoundStatus = async (
  desk_id: number,
): Promise<Response> => {
  const { data } = await API.get(`/user/last_round_status/${desk_id}`);
  return data;
};

// [SLOW-NETWORK FIX] Polling fallback: fetch last finished round result by desk
export const getLastRoundResult = async (
  desk_id: number,
  last_round_id: number,
): Promise<Response> => {
  const { data } = await API.get(
    `/user/last_round_result/${desk_id}/${last_round_id}`,
  );
  return data;
};

export const getNiuniuResultsByDesk = async (
  desk_id: number,
): Promise<Response> => {
  const { data } = await API.get(`/user/niuniu_results/${desk_id}`);
  return data;
};

export const getConfirmedBets = async (
  last_round: number,
): Promise<Response> => {
  const { data } = await API.get(`/user/confirm_bets/${last_round}`);
  return data;
};

export const createBetResult = async (payload: {
  last_round: number;
  bets: {
    result_id: number;
    amount: number;
    image: string;
  }[];
}) => {
  const { data } = await API.post("/user/bet_results", payload);
  return data;
};

export const updateBetResult = async (payload: {
  last_round: number;
  results: {
    result_id: number;
    win_lose_flg: boolean;
  }[];
}) => {
  const { data } = await API.put("/user/bet_results", payload);
  return data;
};

export const cancelBetResult = async (payload: { last_round: number }) => {
  const { data } = await API.post("/user/cancle_bet_results", payload);
  return data;
};

export const updateBetKey = async (payload: {
  last_round: number;
  result_id: number;
  new_result_id: number;
}) => {
  const { data } = await API.put("/user/bet_keys", payload);
  return data;
};

export const getUserBetResults = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get("/user/user_bet_results", { params });
  return data;
};

export const getBetDetailsByDate = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get("/user/user_bet_results/detail", { params });
  return data;
};

export const getTransactions = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get("/user/transactions", { params });
  return data;
};

export const getResultCardByRound = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get("/user/user_bet_results/detail/cards", {
    params,
  });
  return data;
};
