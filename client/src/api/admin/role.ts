import { Response } from "@/types";
import API from "../axios";

export const getRoles = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/roles", { params });
  return data;
};
