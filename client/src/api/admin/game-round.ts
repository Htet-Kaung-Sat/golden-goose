import { Response } from "@/types";
import API from "../axios";

export const getGameRounds = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/game_rounds", { params });
  return data;
};
