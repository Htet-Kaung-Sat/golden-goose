import { RateLimitData } from ".";

export type UserRateLimit = {
  id: number;
  user_id: number;
  rate_limit_id: number;
  rateLimit: RateLimitData;
  createdAt?: Date;
  updatedAt?: Date;
};
