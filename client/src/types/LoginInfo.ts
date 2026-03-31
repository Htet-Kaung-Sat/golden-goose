import { User } from "./User";

export type LoginInfo = {
  id: number;
  user_id: number;
  user: User;
  state: number;
  equipment: string;
  browser: string;
  ip_address: string;
  site: string;
  createdAt: Date;
  updatedAt: Date;
};
