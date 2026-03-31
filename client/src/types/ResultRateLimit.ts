import { RateLimit } from "./RateLimit";
import { Result } from "./Result";

export type ResultRateLimit = {
  id: number;
  result_id: number;
  result?: Result;
  rate_limit_id: number;
  rate_limit?: RateLimit;
  min_bet: number;
  max_bet: number;
  createdAt?: Date;
  updatedAt?: Date;
};
