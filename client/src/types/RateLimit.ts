import { Game } from ".";

export type RateLimit = {
  id: number;
  game_id: number;
  game?: Game;
  min_bet: number;
  max_bet: number;
  createdAt?: Date;
  updatedAt?: Date;
  new_flg?: boolean;
  edit_flg?: boolean;
};
