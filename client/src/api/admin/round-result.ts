import { Response } from "@/types";
import API from "../axios";

export const getRoundResults = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/round_results", { params });
  return data;
};
