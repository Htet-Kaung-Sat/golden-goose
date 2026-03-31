import { Response } from "@/types";
import API from "../axios";
import { LoginInfo } from "@/types/LoginInfo";

export const getLoginInfos = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/login_infos", { params });
  return data;
};

export const getLoginInfo = async (id: number): Promise<LoginInfo> => {
  const { data } = await API.get(`/admin/login_infos/${id}`);
  return data.data.desk;
};

export const createLoginInfo = async (payload: {
  user_id: number;
  site: string;
}) => {
  const { data } = await API.post("/admin/login_infos", payload);
  return data;
};
