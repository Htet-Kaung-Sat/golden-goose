import { Response } from "@/types";
import API from "../axios";

export const getGameSessions = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/game_sessions", { params });
  return data;
};

export const getBootReports = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get(
    `/admin/game_sessions/report_management/boot_report`,
    {
      params,
    },
  );
  return data;
};
