export type Result = {
  id?: number;
  game_id?: number;
  baccarat_type?: string;
  position?: number;
  key: string;
  name?: string;
  isGuess?: boolean;
  ratio?: number;
  createdAt?: Date;
  updatedAt?: Date;
  game?: {
    name?: string;
  };
  edit_flg?: boolean;
};
