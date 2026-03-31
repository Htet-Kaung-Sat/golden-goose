import { ModifyUser, Response } from "@/types";
import API from "../axios";
import { User } from "@/types/User";
import { TopUpSchema } from "@/validation";
import { InferType } from "yup";
type TopUpParam = InferType<typeof TopUpSchema> & {
  actual_amount: number | undefined;
  operator_user_id: number | undefined;
  operated_user_id: number | undefined;
  action: string;
  ip_location: string;
};

/** [PERFORMANCE FIX] Fetches balance/totalBalance only when admin dashboard needs it. */
export const getBalance = async (): Promise<{
  balance: string;
  totalBalance: string;
  permission: string;
}> => {
  const { data } = await API.get("/admin/users/me/balance");
  return data;
};

export const getUsers = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/users", { params });
  return data;
};

export const getUser = async (id: number): Promise<User> => {
  const { data } = await API.get(`/admin/users/${id}`);
  return data.data.user;
};

export const createUser = async (payload: User) => {
  const { data } = await API.post("/admin/users", payload);
  return data;
};

export const updateUser = async (id: number, filters = {}) => {
  const params = {
    ...filters,
  };
  const { data } = await API.put(`/admin/users/${id}`, params);
  return data;
};

export const updateInfo = async (id: number, filters = {}) => {
  const params = {
    ...filters,
  };
  const { data } = await API.put(`/admin/users/info_update/${id}`, params);
  return data;
};

export const getAgentTrees = async (filters = {}): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get("/admin/users/user_management/agent_tree", {
    params,
  });
  return data;
};

export const checkExistOrNotAgents = async (
  filters = {},
): Promise<Response> => {
  const params = {
    ...filters,
  };
  const { data } = await API.get(
    "/admin/users/user_management/check_agent_tree",
    {
      params,
    },
  );
  return data;
};

export const userLockUnlock = async (payload: ModifyUser) => {
  const { data } = await API.put(
    "/admin/users/user_management/lock_unlock",
    payload,
  );
  return data;
};

export const updateUserBalance = async (payload: TopUpParam) => {
  const { data } = await API.put(`/admin/users/user_management/topup`, payload);
  return data;
};

export const OperateUsers = async (payload: {
  creates: Partial<User>[];
  updates: (Partial<User> & { id: number })[];
  deletes: number[];
}): Promise<Response> => {
  const { data } = await API.post("/admin/users/operate", payload);
  return data;
};
