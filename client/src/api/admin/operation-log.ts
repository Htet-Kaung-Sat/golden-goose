import { Response } from "@/types";
import API from "../axios";
import { OperationLogs } from "@/types/OperationLog";

export const getOperationLog = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/operation_logs", { params });
  return data;
};

export const createOperationLog = async (payload: OperationLogs) => {
  const { data } = await API.post("/admin/operation_logs/save", payload);
  return data;
};
