import { Response } from "@/types";
import API from "../axios";
import { RateLimit } from "@/types/RateLimit";

export const getRateLimits = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/rate_limits", { params });
  return data;
};

export const OperateRateLimits = async (payload: {
  creates: Partial<RateLimit>[];
  updates: (Partial<RateLimit> & { id: number })[];
  deletes: number[];
}): Promise<Response> => {
  const { data } = await API.post("/admin/rate_limits/operate", payload);
  return data;
};
