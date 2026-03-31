import { Response } from "@/types";
import API from "../axios";

export const getCodeLookUps = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get(
    "/admin/bet_results/report_mamnagement/code_lookup",
    { params }
  );
  return data;
};

export const getSummaryReports = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get(
    "/admin/bet_results/report_mamnagement/summary_report",
    { params }
  );
  return data;
};

export const getDailyReports = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get(
    "/admin/bet_results/report_mamnagement/daily_report",
    { params }
  );
  return data;
};

export const getOnlinePlayers = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get(
    "/admin/bet_results/report_mamnagement/online_players",
    { params }
  );
  return data;
};
