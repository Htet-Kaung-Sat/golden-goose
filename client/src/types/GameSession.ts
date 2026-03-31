export type GameSession = {
  id: number;
  desk_id: number;
  user_id: number;
  session_no: number;
  status: string;
  start_time: Date;
  end_time: Date;
  createdAt: Date;
  updatedAt: Date;
};
