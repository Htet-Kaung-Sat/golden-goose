import { Response } from "@/types";
import API from "../axios";

export const getGames = async (): Promise<Response> => {
  const { data } = await API.get("/admin/games");
  return data;
};
