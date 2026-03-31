import API from "../axios";

export const playerLogin = async (payload: {
  account: string;
  password: string;
  equipment: string;
  browser: string;
  ip_address: string;
}) => {
  const { data } = await API.post("/auth/player_login", payload);
  return data;
};

export const playerLogout = async (userId: number) => {
  const { data } = await API.post("/auth/player_logout", { userId });
  return data;
};

export const playerVerify = async () => {
  const { data } = await API.get("/auth/player_verify");
  return data;
};
