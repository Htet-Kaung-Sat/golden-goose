import { Camera, Response } from "@/types";
import API from "../axios";

export const getCameras = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/cameras", { params });
  return data;
};

export const getCamera = async (id: number, filters = {}): Promise<Camera> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get(`/admin/cameras/${id}`, { params });
  return data.data.camera;
};

export const createCamera = async (payload: {
  desk_id: number | null;
  camera_no: string;
  position: string;
  url: string;
  status: string;
}) => {
  const { data } = await API.post("/admin/cameras", payload);
  return data;
};

export const updateCamera = async (
  id: string,
  payload: {
    desk_id: number | null;
    camera_no: string;
    position: string;
    url: string;
    status: string;
  }
) => {
  const { data } = await API.put(`/admin/cameras/${id}`, payload);
  return data;
};

export const deleteCamera = async (id: number) => {
  const { data } = await API.delete(`/admin/cameras/${id}`);
  return data;
};

export const getTabletopReports = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get(
    "/admin/cameras/report_management/get_tabletop_report",
    { params }
  );
  return data;
};
