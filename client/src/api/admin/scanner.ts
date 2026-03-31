import { Response, Scanner } from "@/types";
import API from "../axios";

export const getScanners = async (filters = {}): Promise<Response> => {
  const params = { ...filters };

  const { data } = await API.get("/admin/scanners", { params });

  return data;
};

export const getScanner = async (
  id: number,
  filters = {}
): Promise<Scanner> => {
  const { data } = await API.get(`/admin/scanners/${id}`, { params: filters });
  return data.data.scanner;
};

export const createScanner = async (payload: {
  name: string;
  desk_id: number;
  com_port: string;
  serial_number: string;
  position: number;
}) => {
  const { data } = await API.post("/admin/scanners", payload);
  return data;
};

export const updateScanner = async (
  id: number | string,
  payload: {
    name: string;
    desk_id: number;
    serial_number: string;
    com_port: string;
    position: number;
  }
) => {
  const { data } = await API.put(`/admin/scanners/${id}`, payload);
  return data;
};

export const deleteScanner = async (id: number) => {
  const { data } = await API.delete(`/admin/scanners/${id}`);
  return data;
};
