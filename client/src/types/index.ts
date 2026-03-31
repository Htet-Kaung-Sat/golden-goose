import { Announce } from "./Announce";
import { GameRound } from "./GameRound";
import { GameSession } from "./GameSession";
import { LoginInfo } from "./LoginInfo";
import { OperationLogs } from "./OperationLog";
import { RateLimit } from "./RateLimit";
import { Result } from "./Result";
import { ResultRateLimit } from "./ResultRateLimit";
import { Role } from "./Role";
import { RoundResult } from "./RoundResult";
import { User } from "./User";

/* import dayjs from "dayjs"; */
export type Response<> = {
  success: boolean;
  message: string;
  data: ResponseData;
};

export type ResponseData = {
  // common
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  announces: Announce[];
  memberOverviews: MemberOverview[];
  flowOverviews: FlowOverview[];
  users: User[];
  rateLimits: RateLimitData[]; // New User
  loginInfos: LoginInfo[]; // Player Login Log Screen
  betRateLimits: BetRateLimit[]; // Account Information Screen

  onlinePlayers: OnlinePlayers[]; // OnlinePlayer Screen

  // betResult.ts
  codeLookups: CodeLookups[]; // Code Lookup Screen
  summaryResult: SummaryResults[]; // Code Lookup Screen
  totalData: TotalData[]; // Summary Report Screen
  summaryReports: SummaryReports[]; // Summary Report Screen
  directMembers: DirectMembers[]; // Summary Report Screen
  dailyReports: DailyReports[]; // Daily Report Screen

  // desk.ts
  desks: Desk[];
  desk: Desk;
  tabletopReports: TabletopReports[]; // Tabletop Report Screen

  cameras: Camera[];

  // game-session.ts
  sessions: GameSession[];

  // game-round.ts
  rounds: GameRound[];

  // round-result.ts
  roundResults: RoundResult[];

  // scanner.ts
  scanners: Scanner[];

  // game.ts
  games: Game[];
  sessionCount: number; // Game Informations
  lastRound: GameRound; // Game Informations

  // gameSession.ts
  bootReports: BootReports[]; // Boot Report Screen

  //operationLog.ts
  operationLogs: OperationLogs[];

  // result.ts
  results: Result[];

  // role.ts
  roles: Role[];

  // rate-limit.ts
  rate_limits: RateLimit[]; // Rate Limit Management Screen

  /* 
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  games: Game[];
  users: User[];
  logininfos: LoginInfo[];
  sessionCount: number;
  lastRound: GameRound;
  results: Result[]; */

  niuniuResults: NiuniuResult[];
  winCount: WinCount;
  confirmedBets: ConfirmedBets;
  totalBetAmount: number;
  userBetResults: UserBetResults[];
  betDetails: BetDetails[];
  transactions: Transaction[];
  summary: {
    totalBet: number;
    totalWinLoss: number;
  };
  resultCards: ResultCards[];

  // [SLOW-NETWORK FIX] getLastRoundResult polling endpoint
  round_id: number | null;
  result: string | null;
  net_amount: number | null;
};

export type MemberOverview = {
  total_member: number;
  register_today: number;
};

export type FlowOverview = {
  company_deposit_count: number;
  company_deposit_amount: number;
  member_withdrawal_count: number;
  member_withdrawal_amount: number;
};

export type ModifyUser = {
  account: string;
  screen_name: string;
  ip_location: string;
  locking: string;
  event: string;
};

export type RateLimitData = {
  id: number;
  account: string;
  game_id: number;
  game_name: string;
  rate_limit_id: number;
  bet_rate: string;
  min_bet: number;
  max_bet: number;
  results: ResultRateLimit[];
};

export type NewUserRateLimitSave = {
  user_id: number;
  ip_location: string;
  screen_name: string;
  rate_limits: {
    game_id?: number;
    rate_limit_id: number;
  }[];
};

export type BetRateLimit = {
  id: number;
  game_name: string;
  bet_name: string;
  bet_key: string;
  game_min_bet: number;
  game_max_bet: number;
  result_min_bet: number;
  result_max_bet: number;
};

export type OnlinePlayers = {
  desk_session_round: string;
  betting_time: number;
  betting_area: string;
  bets: string;
  ip: string;
};

/* Code Lookup Screen */
export type CodeLookups = {
  id: number;
  order_number: number;
  account_number: string;
  real_name: string;
  desk_name: string;
  bureau: number;
  bet_name: string;
  betting_amount: number;
  valid_amount: number;
  commission: number;
  win_loss_amount: number;
  remaining_amount: number;
  win_loss_result: boolean;
  actual_round_results: string;
  betting_time: Date;
  payment_time: Date;
  ip_address: string;
  bet_state: boolean;
  cancel_flg: boolean;
};
export type SummaryResults = {
  total_betting_amount: number;
  total_valid_amount: number;
  total_win_loss_amount: number;
  total_rows: number;
  total_commission: number;
};

/* Summary Report Screen */
export type TotalData = {
  total_amount: number;
  valid_total_amount: number;
  wash_code_amount: number;
  win_lose_total_amount: number;
  wash_code_payment: number;
  total_win_lose: number;
};
export type SummaryReports = {
  id: number;
  account: string;
  real_name: string;
  name: string;
  remaining_amount: number;
  total_balance: number;
  bonus_type: string;
  bonus_rate: string;
  total_amount: number;
  valid_total_amount: number;
  wash_code_amount: number;
  win_lose_total_amount: number;
  washing_ratio: number;
  wash_code_payment: number;
  actual_win_lose: number;
  account_for: number;
  divided_into: number;
  share: number;
  superior_divide: number;
  action: boolean;
};
export type DirectMembers = {
  id: number;
  account: string;
  name: string;
  remaining_amount: number;
  total_amount: number;
  bonus_type?: string;
  bonus_rate?: string;
  valid_total_amount: number;
  wash_code_amount: number;
  win_lose_total_amount: number;
  washing_ratio: string;
  wash_code_payment: number;
  actual_win_lose: number;
};

// desk.ts
/* Tabletop Screen */
export type TabletopReports = {
  id: number;
  desk_no: number | string;
  name: string;
  total_amount: number;
  win_lose_total_amount: number;
  valid_total_amount: number;
  wash_code_volume: number;
  water_bill: number;
};

// gameSession.ts
/* Boot Report Screen */
export type BootReports = {
  id: number;
  shoe_size: string;
  total_amount: number;
  valid_total_amount: number;
  win_lose_total_amount: number;
  wash_code_volume: number;
  commission_fee?: number;
};

/* Daily Report Screen */
export type DailyReports = {
  date: string;
  total_amount: number;
  valid_total_amount: number;
  wash_code_amount: number;
  win_lose_total_amount: number;
  wash_code_payment: number;
  total_win_lose: number;
};

// desks table
export type Desk = {
  id: number;
  game_id: number;
  name: string;
  game: Game;
  baccarat_type: string;
  desk_no: number;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  last_round: GameRound;
  session: GameSession;
  results: GameResult[];
};

export type GameResult = {
  key: string;
  round_id: number;
};
// camera table
export type Camera = {
  id: number;
  desk_id: number;
  desk?: Desk;
  camera_no: string;
  position: string;
  url: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

//scanners table
export type Scanner = {
  id: number;
  name: string;
  desk_id: number;
  com_port: string;
  serial_number: string;
  position: number;
  desk: Desk;
  createdAt: Date;
  updatedAt: Date;
};

// games table
export type Game = {
  id: number;
  name: string;
  type: string;
  results: Result[];
  createdAt: Date;
  updatedAt: Date;
};

// transactions table
export type Transaction = {
  id: number;
  bet_result_id: number;
  topup_no: number;
  recalculate_no: number;
  transaction_type: string;
  amount?: number;
  before_amount: number;
  after_amount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NiuniuResult = {
  banker: number | string;
  player1?: number | string;
  player2?: number | string;
  player3?: number | string;
  player1Win?: boolean;
  player2Win?: boolean;
  player3Win?: boolean;
};

export type WinCount = {
  player1: number;
  player2: number;
  player3: number;
};

export type UserNetAmount = {
  user_id: number;
  win_amount: number;
  lose_amount: number;
  net_amount: number;
};

export type ConfirmedBets = Record<
  string,
  {
    result_id: number;
    amount: number;
    image: string;
  }
>;

export type UserBetResults = {
  id: number;
  report_date: string;
  amount_summary: string;
  win_lose_total_amount: number;
  commission_summary: string;
  total_net_win_lose: string;
};

export type BetDetails = {
  desk_name: string;
  shoe_round_no: string;
  after_balance: string;
  before_balance: string;
  trans_amount: string;
  transaction_type: string;
  transaction_time: string;
  bet_amount: string;
  actual_win_lose_amount: string;
  win_lose_flg: boolean;
  settle_flg: boolean| number;
  cancel_flg?: boolean | number;
  commission: number;
  status_text: string;
  bet_result_id: number;
};

export type GameType = "NIUNIU" | "BACCARAT" | "LONGHU";

export type BaccaratCards = {
  banker: string[];
  player1: string[];
};

export type MultiPlayerCards = {
  first_card: string;
  banker?: string[];
  player1?: string[];
  player2?: string[];
  player3?: string[];
};

export type GameRoundCards = BaccaratCards | MultiPlayerCards;

export type ResultCards = {
  bet_result_id: number;
  bet_amount: string | number;
  actual_win_lose_amount: string | number;
  result_name: string;
  result_ratio: number;
  game_type: GameType;
  baccarat_type: string;
  game_round_cards: GameRoundCards;
};
