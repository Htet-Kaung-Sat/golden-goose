import API from "../axios";

export const adminLogin = async (payload: {
  account: string;
  password: string;
  equipment: string;
  browser: string;
  ip_address: string;
}) => {
  const { data } = await API.post("/auth/login", payload);
  return data;
};

/**
 * [SECURITY FIX] Validate admin session server-side.
 * Uses the httpOnly auth cookie; call from admin layout on mount.
 * On 401 the axios interceptor redirects to /admin/login; on 403 we treat as auth failure in the layout.
 */
export const adminVerify = async () => {
  const { data } = await API.get("/admin/auth/verify");
  return data;
};
