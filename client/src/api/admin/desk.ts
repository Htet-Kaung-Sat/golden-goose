import { Desk, Response } from "@/types";
import API from "../axios";

export const getDesks = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/desks", { params });
  return data;
};

export const getDesk = async (id: number, filters = {}): Promise<Desk> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get(`/admin/desks/${id}`, { params });
  return data.data.desk;
};

export const createDesk = async (payload: {
  name: string;
  game_id: number;
  baccarat_type: string;
  desk_no: number;
  position: number;
}) => {
  const { data } = await API.post("/admin/desks", payload);
  return data;
};

export const updateDesk = async (
  id: string,
  payload: {
    name: string;
    game_id: number;
    baccarat_type: string;
    desk_no: number;
    position: number;
  }
) => {
  const { data } = await API.put(`/admin/desks/${id}`, payload);
  return data;
};

export const deleteDesk = async (id: number) => {
  const { data } = await API.delete(`/admin/desks/${id}`);
  return data;
};

export const getTabletopReports = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get(
    "/admin/desks/report_management/get_tabletop_report",
    { params }
  );
  return data;
};
