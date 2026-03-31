import { Response } from "@/types";
import API from "../axios";
import { Result } from "@/types/Result";

export const getResults = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/results", { params });
  return data;
};

export const OperateResults = async (payload: {
  updates: (Partial<Result> & { id: number })[];
}): Promise<Response> => {
  const { data } = await API.post("/admin/results/operate", payload);
  return data;
};
