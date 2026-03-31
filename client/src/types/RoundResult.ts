import { Result } from "./Result";

export type RoundResult = {
  id: number;
  round_id: number;
  result_id: number;
  result?: Result;
  createdAt: Date;
  updatedAt: Date;
};
