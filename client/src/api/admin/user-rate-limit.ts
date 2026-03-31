import { NewUserRateLimitSave, Response } from "@/types";
import API from "../axios";

export const getBetRateLimits = async (filters = {}): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get(
    `/admin/user_rate_limits/account_information/bet_rate_limits`,
    { params }
  );
  return data;
};

export const getUpperUserRateLimits = async (
  filters = {}
): Promise<Response> => {
  const params = { ...filters };
  const { data } = await API.get(
    "/admin/user_rate_limits/new_user/upper_user_rate",
    {
      params,
    }
  );
  return data;
};

export const saveUserRateLimits = async (payload: NewUserRateLimitSave) => {
  const { data } = await API.post("/admin/user_rate_limits/save", payload);
  return data;
};

export const mergeUserRateLimits = async (payload: NewUserRateLimitSave) => {
  const { data } = await API.post("/admin/user_rate_limits/merge", payload);
  return data;
};
