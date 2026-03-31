import React, { useEffect } from "react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@radix-ui/react-label";
import {
  getBetDetailsByDate,
  getUserBetResults,
  getTransactions,
  getResultCardByRound,
  getProfile,
  changePassword,
} from "@/api/user";
import {
  BetDetails,
  UserBetResults,
  Transaction,
  ResultCards,
  GameType,
} from "@/types";
import { User } from "@/types/User";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
}

const REPORT_TABS = [
  { key: "bet", label: "注单报表" },
  { key: "transaction", label: "交易记录" },
  { key: "profile", label: "个人资料" },
  { key: "password", label: "修改密码" },
] as const;

type ReportTabKey = (typeof REPORT_TABS)[number]["key"];

/** Dialog with tabs: Bet Report, Transaction Record, Profile, and Change Password. */
const ReportDialog: React.FC<ReportDialogProps> = ({ open, onClose }) => {
  const [filter, setFilter] = useState("today");
  const [activeTab, setActiveTab] = useState<ReportTabKey>("bet");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [betResults, setBetResults] = useState<UserBetResults[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [betDetails, setBetDetails] = useState<BetDetails[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ totalBet: 0, totalWinLoss: 0 });
  const [resultCard, setResultCard] = useState<ResultCards | null>(null);
  const [isGameResultOpen, setIsGameResultOpen] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const itemsPerPage = 7;

  const PASSWORD_REGEX = /^[A-Za-z0-9]{6,32}$/;

  /** Fetches user bet results for the given date filter (today, yesterday, 7days). */
  const fetchUserBetResults = async (filterValue: string) => {
    setBetResults([]);
    try {
      const result = await getUserBetResults({ date: filterValue });
      setBetResults(result.data.userBetResults);
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(error.response?.data?.message || "Server Error");
      }
    }
  };

  /** Handles row click in the bet report table: opens detail popup and fetches bet details for the selected date. */
  const handleRowClick = async (date: string, page: number) => {
    try {
      setSelectedDate(date);
      setIsDetailOpen(true);
      setCurrentPage(page);
      const result = await getBetDetailsByDate({
        page: page,
        limit: itemsPerPage,
        date: date,
      });
      setBetDetails(result.data.betDetails);
      setTotalPages(result.data.pagination.totalPages);
      setSummary(result.data.summary);
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message || "Failed to fetch data");
      }
    }
  };

  /** Fetches transaction records for the given filter and page. */
  const fetchTransactions = async (filterValue: string, page: number) => {
    try {
      const res = await getTransactions({
        filter: filterValue,
        page: page,
        limit: itemsPerPage,
      });
      setTransactions(res.data.transactions);
      setTotalPages(res.data.pagination.totalPages);
      setSummary(res.data.summary);
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message || "Failed to fetch data");
      }
    }
  };

  /** Fetches result cards for a bet round and opens the game result popup. */
  const handleOpenGameResult = async (betResultId: number) => {
    try {
      const res = await getResultCardByRound({ betResultId });
      const cardsArray = res.data.resultCards;
      if (cardsArray && cardsArray.length > 0) {
        const firstCard = cardsArray[0];
        setResultCard(firstCard);
        setIsGameResultOpen(true);
      } else {
        toast.error("未找到该局详情数据");
        setResultCard(null);
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message || "Failed to fetch data");
      }
    }
  };

  /** Fetches profile when the profile tab is shown (backend uses login user id). */
  const fetchProfile = async () => {
    setProfile(null);
    try {
      const { user } = await getProfile();
      setProfile(user);
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(
          (error.response?.data as { message?: string })?.message ||
            "加载个人资料失败",
        );
      }
    }
  };

  /** Submit password change: validate 6-32 alphanumeric, match; then call API. On success show alert and reset inputs. */
  const handlePasswordSubmit = async () => {
    if (!newPassword.trim()) {
      setPasswordError("请输入新密码");
      setTimeout(() => {
        setPasswordError(null);
      }, 2000);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的密码不一致");
      setTimeout(() => {
        setPasswordError(null);
      }, 2000);
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordError("只能由6-32位数字和字母组成");
      setTimeout(() => {
        setPasswordError(null);
      }, 2000);
      return;
    }
    setPasswordSubmitting(true);
    setPasswordError(null);
    try {
      await changePassword({ new_password: newPassword });
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } catch (error) {
      if (error instanceof AxiosError) {
        const msg =
          (error.response?.data as { message?: string })?.message || "修改失败";
        setPasswordError(msg);
      }
    } finally {
      setTimeout(() => {
        setPasswordSuccess(false);
        setPasswordError(null);
      }, 2000);
      setPasswordSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) setPasswordError(null);
  }, [open]);

  useEffect(() => {
    if (open && activeTab === "bet") {
      fetchUserBetResults(filter);
    } else if (open && activeTab === "transaction") {
      fetchTransactions(filter, currentPage);
    } else if (open && activeTab === "profile") {
      fetchProfile();
    }
  }, [activeTab, open, filter, currentPage]);

  /** Updates the date filter and resets to the first page. */
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative flex flex-col w-2/3 h-[855px] bg-[#3b2a1f] rounded-lg overflow-hidden border border-yellow-600/30">
        <div className="flex shrink-0 bg-[#5a3f2a] text-white text-2xl">
          {REPORT_TABS.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-8 py-4 cursor-pointer transition ${
                activeTab === tab.key
                  ? "bg-[#7a5535] border-b-4 border-yellow-400"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {tab.label}
            </div>
          ))}

          <button
            onClick={onClose}
            className="ml-auto text-yellow-400 hover:scale-110 transition"
          >
            <Icon
              icon="material-symbols:close-rounded"
              width="50"
              className="cursor-pointer mr-5"
            />
          </button>
        </div>

        {(activeTab === "bet" || activeTab === "transaction") && (
          <div className="flex shrink-0 gap-5 px-8 py-5 text-white text-xl">
            <Label>时间</Label>
            <Select value={filter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px] bg-[#7a5535] border-none text-white text-2xl px-6 py-3 rounded-md">
                <SelectValue placeholder="今日报表" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today" className="text-2xl">
                  今日报表
                </SelectItem>
                <SelectItem value="yesterday" className="text-2xl">
                  昨日报表
                </SelectItem>
                <SelectItem value="7days" className="text-2xl">
                  7日报表
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {activeTab === "bet" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="grid shrink-0 grid-cols-5 bg-[#6a4a33] text-white text-xl px-8 py-4 border-b border-yellow-600/20">
              <div className="text-left">日期</div>
              <div className="text-center">总投注 / 有效</div>
              <div className="text-center">输赢</div>
              <div className="text-center">佣金 / 洗码额</div>
              <div className="text-center">总输赢</div>
            </div>
            <div className="flex-1 bg-[#2c1f16] overflow-y-auto px-8 custom-scrollbar">
              {betResults.length > 0 ? (
                betResults.map((row, index) => (
                  <div
                    key={index}
                    onClick={() => handleRowClick(row.report_date, 1)}
                    className="grid grid-cols-5 py-5 border-b border-yellow-900/20 text-white text-xl items-center hover:bg-yellow-400/10 cursor-pointer active:scale-[0.99] transition-all"
                  >
                    <div className="text-left font-mono">{row.report_date}</div>
                    <div className="whitespace-pre-line text-center leading-tight">
                      {row.amount_summary}
                    </div>
                    <div className="text-center">
                      {row.win_lose_total_amount}
                    </div>
                    <div className="whitespace-pre-line text-center text-gray-300 leading-tight">
                      {row.commission_summary}
                    </div>
                    <div
                      className={`text-center font-bold ${
                        Number(row.total_net_win_lose) >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {Number(row.total_net_win_lose).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500 text-2xl italic">
                  暂无数据
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "transaction" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="grid shrink-0 grid-cols-[60px_2fr_1fr_1.5fr] bg-[#1a110a] text-[#b09b8a] text-xl px-8 py-4 border-b border-yellow-900/50">
              <div className="text-center">类型</div>
              <div className="text-center">操作时间</div>
              <div className="text-center">金额/余额</div>
              <div className="text-center">备注/单号</div>
            </div>
            <div className="flex-1 bg-[#2c1f16] overflow-y-auto custom-scrollbar">
              {transactions.length > 0 ? (
                transactions.map((row, i) => {
                  const [date, time] = new Date(row.createdAt)
                    .toISOString()
                    .replace("T", " ")
                    .split(" ");

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[60px_2fr_1fr_1.5fr] px-8 py-3 border-b border-yellow-900/10 items-center text-white text-xl"
                    >
                      <div className="text-center text-gray-300">
                        {row.transaction_type === "withdraw" ||
                        row.transaction_type === "topup"
                          ? "充提"
                          : "游戏"}
                      </div>
                      <div className="text-center leading-tight">
                        <div className="text-gray-200 text-lg">{date}</div>
                        <div className="text-gray-400 text-base">
                          {time.split(".")[0]}
                        </div>
                      </div>

                      <div className="text-center leading-tight">
                        <div
                          className={
                            row.transaction_type === "payout" ||
                            row.transaction_type === "topup" ||
                            row.transaction_type === "recalculate" ||
                            row.transaction_type === "cancel"
                              ? "text-red-500"
                              : "text-green-500"
                          }
                        >
                          {row.transaction_type === "betting"
                            ? `-${Number(row.amount).toFixed(3)}`
                            : Number(row.amount).toFixed(3)}
                        </div>
                        <div className="text-gray-400 text-lg">
                          {Number(row.after_amount).toFixed(3)}
                        </div>
                      </div>

                      <div className="text-center text-lg">
                        <span className="text-gray-200">
                          {row.transaction_type === "betting"
                            ? "下注成功"
                            : row.transaction_type === "recalculate"
                              ? "重算"
                              : row.transaction_type === "payout"
                                ? "派彩"
                                : row.transaction_type === "topup"
                                  ? "上分"
                                  : row.transaction_type === "withdraw"
                                    ? "下分"
                                    : "取消单"}
                          {"  "}|{"  "}
                          {row.transaction_type === "topup"
                            ? row.topup_no
                            : row.bet_result_id}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 italic">
                  暂无记录
                </div>
              )}
            </div>
            <div className="bg-[#1a110a] shrink-0 px-8 py-4 flex items-center justify-between text-2xl border-t border-yellow-900/50">
              <div className="flex items-center gap-6">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className={`text-white text-4xl transition-transform active:scale-90 ${
                    currentPage === 1
                      ? "opacity-20 cursor-not-allowed"
                      : "hover:text-yellow-500"
                  }`}
                >
                  {"<"}
                </button>
                <span className="text-white font-mono min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage >= totalPages}
                  className={`text-white text-4xl transition-transform active:scale-90 ${
                    currentPage >= totalPages
                      ? "opacity-20 cursor-not-allowed"
                      : "hover:text-yellow-500"
                  }`}
                >
                  {">"}
                </button>
              </div>
              <div className="flex gap-10">
                <div className="text-white">
                  输赢
                  <span
                    className={`ml-4 ${summary.totalWinLoss >= 0 ? "text-red-500" : "text-green-500"}`}
                  >
                    {Number(summary.totalWinLoss).toFixed(2)}
                  </span>
                </div>
                <div className="text-white">
                  投注
                  <span className="text-white ml-4">
                    {Number(summary.totalBet)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="flex gap-12 px-10 py-8 text-white text-xl">
            {profile ? (
              <>
                <div className="flex-1">
                  <div className="text-3xl mb-4 border-b border-yellow-500 pb-2">
                    账户信息
                  </div>
                  <div className="space-y-4">
                    <ProfileRow label="账户ID" value={profile.account ?? "-"} />
                    <ProfileRow label="姓名" value={profile.name ?? "-"} />
                    <ProfileRow label="电话" value="empty" />
                    <ProfileRow label="账户类型" value="empty" />
                    <ProfileRow label="货币类型" value="人民币" />
                    <ProfileRow
                      label="状态"
                      value={profile.state === "normal" ? "正常" : "-"}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-3xl mb-4 border-b border-yellow-500 pb-2">
                    洗码设定
                  </div>
                  <ProfileRow
                    label="洗码率"
                    value={
                      profile.bonus_rate != null
                        ? `${Number(profile.bonus_rate)}%`
                        : "-"
                    }
                  />
                </div>
                <div className="flex-1">
                  <div className="text-3xl mb-4 border-b border-yellow-500 pb-2">
                    限红
                  </div>
                  <div className="space-y-4">
                    {(profile.userRateLimits ?? []).map((url) => {
                      const rl = url.rateLimit;
                      const gameName =
                        (rl as { game?: { name?: string } })?.game?.name ?? "—";
                      const min = (rl as { min_bet?: number })?.min_bet ?? 0;
                      const max = (rl as { max_bet?: number })?.max_bet ?? 0;
                      return (
                        <ProfileRow
                          key={url.id}
                          label={gameName}
                          value={`${min} - ${max}`}
                        />
                      );
                    })}
                    {(!profile.userRateLimits ||
                      profile.userRateLimits.length === 0) && (
                      <ProfileRow label="—" value="—" />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center py-12 text-gray-400">
                无法加载个人资料
              </div>
            )}
          </div>
        )}

        {activeTab === "password" && (
          <div className="relative flex flex-col items-center justify-center h-full gap-6 text-xl">
            <input
              type="password"
              placeholder="请输入新密码"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-[420px] h-[60px] rounded-md bg-gray-400 text-black text-center placeholder-black focus:outline-none"
              disabled={passwordSubmitting}
            />

            <input
              type="password"
              placeholder="重复新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-[420px] h-[60px] rounded-md bg-gray-400 text-black text-center placeholder-black focus:outline-none"
              disabled={passwordSubmitting}
            />

            <div className="text-red-500 text-lg">
              只能由6-32位数字和字母组成
            </div>

            <button
              type="button"
              onClick={handlePasswordSubmit}
              disabled={passwordSubmitting}
              className="mt-4 px-14 py-3 text-2xl rounded-lg bg-gradient-to-b from-lime-400 to-lime-600 text-black font-semibold hover:brightness-110 active:scale-95 transition disabled:opacity-60"
            >
              修改
            </button>
          </div>
        )}
      </div>
      {/* Success overlay: same layout as image – two gray boxes, checkmark, 修改成功, 修改 button */}
      {passwordSuccess && (
        <div className="absolute top-100 inset-0 h-80 flex flex-col items-center justify-center bg-black/75 z-10 gap-6">
          <div className="flex flex-col items-center gap-4">
            <Icon
              icon="material-symbols:check-circle-outline"
              className="text-yellow-300"
              width={100}
              height={100}
            />
            <span className="text-white text-5xl font-semibold">修改成功</span>
          </div>
        </div>
      )}

      {/* Error overlay – password change only */}
      {passwordError && (
        <div className="absolute top-100 h-80 inset-0 z-20 flex flex-col items-center justify-center bg-black/75">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/50">
              <Icon
                icon="material-symbols:error-outline"
                className="text-red-400"
                width={100}
                height={100}
              />
            </div>
            <p className="text-white text-5xl font-semibold">{passwordError}</p>
          </div>
        </div>
      )}
      <BetDetailPopup
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        data={betDetails}
        summary={summary}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => handleRowClick(selectedDate!, page)}
        onRowClick={handleOpenGameResult}
      />
      <GameResultPopup
        open={isGameResultOpen}
        data={resultCard}
        onClose={() => setIsGameResultOpen(false)}
      />
    </div>
  );
};

/** Popup component displaying paginated bet details for a selected date. */
const BetDetailPopup = ({
  open,
  onClose,
  data,
  summary,
  currentPage,
  totalPages,
  onPageChange,
  onRowClick,
}: {
  open: boolean;
  onClose: () => void;
  data: BetDetails[];
  summary: { totalBet: number; totalWinLoss: number };
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRowClick: (betResultId: number) => void;
}) => {
  if (!open) return null;
  const pageSubTotal = data.reduce(
    (sum, item) => sum + Number(item.trans_amount.replace(/,/g, "")),
    0,
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl bg-[#2c1f16] rounded-xl border border-yellow-900/50 overflow-hidden shadow-2xl flex flex-col h-[700px]">
        <div className="relative bg-[#513a29] py-5 text-center border-b border-yellow-700/30">
          <h2 className="text-white text-4xl font-bold tracking-[0.2em]">
            下注纪录
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 border border-yellow-600/50 rounded-full text-yellow-500 hover:bg-yellow-500/10 transition flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr] bg-[#1a110a] text-[#b09b8a] text-xl px-8 py-4">
          <div className="text-center">桌号/场次</div>
          <div className="text-center">佣金 /洗码额</div>
          <div className="text-center">时间</div>
          <div className="text-center">派彩/下注</div>
          <div className="text-center">余额/状态</div>
        </div>
        <div className="flex-1 overflow-auto bg-[#2c1f16]">
          {data.length > 0 ? (
            data.map((item, i) => {
              const isCancelled = item.cancel_flg === 1;
              const isSettled = item.settle_flg === 0;
              return (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(item.bet_result_id);
                  }}
                  className="cursor-pointer grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr] px-8 py-5 border-b border-yellow-900/10 items-center text-white text-xl hover:bg-white/5 transition-colors relative"
                >
                  {(isCancelled || isSettled) && (
                    <div
                      className="absolute inset-0 pointer-events-none flex items-center"
                      aria-hidden
                    >
                      <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-px bg-gray-400/80" />
                    </div>
                  )}
                  <div className="text-center">
                    <div>{item.desk_name}</div>
                    <div className="text-lg text-gray-400">
                      {item.shoe_round_no}
                    </div>
                  </div>
                  <div className="text-center">
                    <div>
                      {item.desk_name === "G20" ||
                      item.cancel_flg === 1 ||
                      item.desk_name === "N6" ||
                      item.desk_name === "N8"
                        ? "0.00"
                        : Number(item.bet_amount).toFixed(2)}
                    </div>
                    <div className="text-lg text-gray-400">
                      {Number(item.commission).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center font-mono">
                    <div className="text-gray-200">
                      {
                        new Date(item.transaction_time)
                          .toISOString()
                          .split("T")[0]
                      }
                    </div>
                    <div className="text-lg text-gray-400">
                      {
                        new Date(item.transaction_time)
                          .toTimeString()
                          .split(" ")[0]
                      }
                    </div>
                  </div>
                  <div className="text-center font-bold">
                    <div
                      className={
                        Number(item.trans_amount) === 0
                          ? item.transaction_type === "recalculate"
                            ? "text-green-500"
                            : "text-red-500"
                          : Number(item.trans_amount) > 0
                            ? "text-green-500"
                            : "text-red-500"
                      }
                    >
                      {isSettled
                        ? "0.00"
                        : Number(item.trans_amount.replace(/,/g, "")).toFixed(
                            2,
                          )}
                    </div>
                    <div className="text-lg text-gray-400 font-normal">
                      {Number(item.bet_amount).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-100">
                      {Number(item.after_balance).toFixed(2)}
                    </div>
                    <div className="text-lg text-gray-400">
                      {item.status_text}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 text-2xl italic">
              暂无记录
            </div>
          )}
        </div>
        <div className="bg-[#1a110a] px-8 py-5 border-t border-yellow-900/50 flex items-center justify-between text-xl">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className={`text-white text-4xl transition ${
                currentPage <= 1
                  ? "opacity-20 cursor-not-allowed"
                  : "hover:text-yellow-500 active:scale-90"
              }`}
            >
              {"<"}
            </button>

            <span className="text-white font-mono min-w-[80px] text-center text-2xl">
              {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || totalPages === 0}
              className={`text-white text-4xl transition ${
                currentPage >= totalPages || totalPages === 0
                  ? "opacity-20 cursor-not-allowed"
                  : "hover:text-yellow-500 active:scale-90"
              }`}
            >
              {">"}
            </button>
          </div>
          <div className="flex gap-10 font-medium">
            <div className="text-gray-400">
              小计:{" "}
              <span
                className={
                  pageSubTotal >= 0 ? "text-green-500" : "text-red-500"
                }
              >
                {pageSubTotal.toFixed(2)}
              </span>
            </div>
            <div className="text-gray-400">
              总输赢:{" "}
              <span
                className={
                  summary.totalWinLoss >= 0 ? "text-green-500" : "text-red-500"
                }
              >
                {Number(summary.totalWinLoss).toFixed(2)}
              </span>
            </div>
            <div className="text-gray-400">
              总投注:{" "}
              <span className="text-green-500">{Number(summary.totalBet)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type Card = string;

type ArrayCards = {
  banker?: Card[];
  player1?: Card[];
  player2?: Card[];
  player3?: Card[];
  first_card?: Card;
};

type ObjectCards = {
  banker?: Record<string, Card | null>;
  player?: Record<string, Card | null>;
};

type RawCards = ArrayCards | ObjectCards | null;

type NormalizedCards = {
  banker?: Card[];
  player1?: Card[];
  player2?: Card[];
  player3?: Card[];
};

/** Type guard: returns true if cards use array format (player1, player2, etc.). */
const isArrayCards = (cards: RawCards): cards is ArrayCards =>
  !!cards && "player1" in cards;

/** Type guard: returns true if cards use object format (player, banker). */
const isObjectCards = (cards: RawCards): cards is ObjectCards =>
  !!cards && "player" in cards;

/** Normalizes raw card data (array or object format) into a unified structure. */
const normalizeCards = (cards: RawCards): NormalizedCards => {
  if (!cards) return {};

  const result: NormalizedCards = {};

  if (isArrayCards(cards)) {
    result.player1 = cards.player1?.filter(Boolean);
    result.player2 = cards.player2?.filter(Boolean);
    result.player3 = cards.player3?.filter(Boolean);
    result.banker = cards.banker?.filter(Boolean);
  }

  if (isObjectCards(cards)) {
    if (cards.player) {
      result.player1 = Object.values(cards.player).filter(
        (v): v is string => typeof v === "string",
      );
    }

    if (cards.banker) {
      result.banker = Object.values(cards.banker).filter(
        (v): v is string => typeof v === "string",
      );
    }
  }

  return result;
};

/** Popup displaying game result details (cards, scores, bet info) for Baccarat, Longhu, or Niuniu. */
const GameResultPopup = ({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: ResultCards | null;
  onClose: () => void;
}) => {
  if (!open || !data) return null;

  const rawCards: RawCards = data.game_round_cards;
  const gameType: GameType = data.game_type as GameType;
  const baccaratType: string = data.baccarat_type;
  type HandType = "bomb" | "fiveFace" | "niuNiu" | "niu" | "noNiu";
  type Seat = "banker" | "player1" | "player2" | "player3";
  const RANK_VALUE: Record<string, number> = {
    A: 1,
    J: 11,
    Q: 12,
    K: 13,
  };
  const SUIT_VALUE: Record<string, number> = {
    S: 4,
    H: 3,
    C: 2,
    D: 1,
  };
  const {
    player1 = [],
    player2 = [],
    player3 = [],
    banker = [],
  } = normalizeCards(data.game_round_cards);
  const cards: Record<Seat, string[]> = {
    banker,
    player1,
    player2,
    player3,
  };
  const HAND_TYPE_RANK: Record<HandType, number> = {
    bomb: 6,
    fiveFace: 5,
    niuNiu: 4,
    niu: 3,
    noNiu: 1,
  };

  const firstCard = isArrayCards(rawCards) ? rawCards.first_card : undefined;

  /** Returns the point value of a card rank for Niuniu (J/Q/K=10, A=1, others=number). */
  const niuPoint = (rank: string) => {
    if (["J", "Q", "K"].includes(rank)) return 10;
    if (rank === "1") return 1;
    return Number(rank);
  };

  /** Extracts the rank (e.g., A, K, 10) from a card string. */
  const getRank = (card: string) => card.slice(1);

  /** Calculates the Niuniu (牛牛) point for a 5-card hand. Returns 0–10 (10 = 牛牛). */
  const calcNiu = (hand: string[]) => {
    const values = hand.map((c) => niuPoint(getRank(c)));

    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 4; j++) {
        for (let k = j + 1; k < 5; k++) {
          const sum3 = values[i] + values[j] + values[k];
          if (sum3 % 10 === 0) {
            const rest = values.reduce((a, b) => a + b, 0) - sum3;
            const niu = rest % 10;
            return niu === 0 ? 10 : niu;
          }
        }
      }
    }
    return 0;
  };

  /** Returns true if the hand contains four cards of the same rank (炸弹). */
  const isBomb = (hand: string[]) => {
    const count: Record<string, number> = {};
    hand.forEach((c) => {
      const rank = getRank(c);
      count[rank] = (count[rank] || 0) + 1;
    });
    return Object.values(count).includes(4);
  };

  /** Returns true if all five cards are face cards (J, Q, K) — 5公. */
  const isFiveFace = (hand: string[]) => {
    return hand.every((c) => ["J", "Q", "K"].includes(getRank(c)));
  };

  /** Formats hand type as display text (e.g., "牛牛", "牛 7", "无牛", "炸弹", "5公"). */
  const formatHandText = (hand: string[]) => {
    if (isBomb(hand)) return "炸弹";
    if (isFiveFace(hand)) return "5公";

    const niu = calcNiu(hand);
    if (niu === 10) return "牛牛";
    if (niu === 0) return "无牛";
    return `牛 ${niu}`;
  };

  /** Returns the hand type key for Niuniu comparison (bomb, fiveFace, niuNiu, niu, noNiu). */
  const getHandType = (hand: string[]) => {
    if (isBomb(hand)) return "bomb";
    if (isFiveFace(hand)) return "fiveFace";

    const niu = calcNiu(hand);
    if (niu === 10) return "niuNiu";
    if (niu > 0) return "niu";
    return "noNiu";
  };

  /** Returns the highest card in the hand by rank, then suit (for tiebreaker). */
  const getMaxCard = (cards: string[]) => {
    return cards.reduce((max, card) => {
      const r1 = getCardRankValue(card);
      const r2 = getCardRankValue(max);

      if (r1 > r2) return card;
      if (r1 < r2) return max;

      return getCardSuitValue(card) > getCardSuitValue(max) ? card : max;
    });
  };

  /** Returns numeric rank value (A=1, J=11, Q=12, K=13, numbers as-is). */
  const getCardRankValue = (card: string) => {
    const rank = card.slice(1);
    return RANK_VALUE[rank] ?? Number(rank);
  };

  /** Returns suit value for comparison (S=4, H=3, C=2, D=1). */
  const getCardSuitValue = (card: string) => {
    const suit = card[0];
    return SUIT_VALUE[suit];
  };

  /** Compares banker and player Niuniu hands; returns "player" or "banker" as the winner. */
  const compareHands = (
    bankerCards: string[],
    playerCards: string[],
    bankerNiu: number,
    playerNiu: number,
  ) => {
    const bankerType = getHandType(bankerCards);
    const playerType = getHandType(playerCards);

    if (HAND_TYPE_RANK[playerType] !== HAND_TYPE_RANK[bankerType]) {
      return HAND_TYPE_RANK[playerType] > HAND_TYPE_RANK[bankerType]
        ? "player"
        : "banker";
    }

    if (bankerType === "niu" || bankerType === "niuNiu") {
      if (playerNiu !== bankerNiu) {
        return playerNiu > bankerNiu ? "player" : "banker";
      }
    }

    const bankerMax = getMaxCard(bankerCards);
    const playerMax = getMaxCard(playerCards);

    const rankDiff = getCardRankValue(playerMax) - getCardRankValue(bankerMax);
    if (rankDiff !== 0) return rankDiff > 0 ? "player" : "banker";

    return getCardSuitValue(playerMax) > getCardSuitValue(bankerMax)
      ? "player"
      : "banker";
  };

  /** Returns formatted hand text and win status for a given seat vs banker. */
  const getSeatResult = (seat: Seat) => {
    const bankerCards = cards.banker;
    const bankerNiu = calcNiu(bankerCards);

    if (seat === "banker") {
      return {
        text: formatHandText(bankerCards),
        win: false,
      };
    }

    const playerCards = cards[seat];
    const playerNiu = calcNiu(playerCards);

    const winner = compareHands(bankerCards, playerCards, bankerNiu, playerNiu);

    return {
      text: formatHandText(playerCards),
      win: winner === "player",
    };
  };

  /** Calculates Baccarat hand score (sum of card values mod 10). */
  const calculateBaccaratScore = (cardList: string[]) => {
    const score = cardList.reduce((acc, card) => {
      const rank = card.substring(1);
      if (["10", "J", "Q", "K"].includes(rank)) return acc + 0;
      if (rank === "A") return acc + 1;
      return acc + parseInt(rank);
    }, 0);
    return score % 10;
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-7xl bg-[#2c1f16] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="relative bg-[#513a29] py-5 text-center shadow-md z-10">
          <h2 className="text-white text-3xl font-bold tracking-wider">
            下注详情
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer absolute right-6 top-1/2 -translate-y-1/2 text-yellow-500 hover:text-yellow-300 text-3xl transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-4 px-5 py-5 text-2xl font-bold text-white border-b border-yellow-700/40">
          <div className="text-center">类型</div>
          <div className="text-center">赔率</div>
          <div className="text-center">下注金额</div>
          <div className="text-center">派彩</div>
        </div>
        <div className="grid grid-cols-4 px-5 py-5 text-white text-lg">
          <div className="text-center">{data.result_name}</div>
          <div className="text-center">
            {gameType !== "NIUNIU" ? `1 : ${Number(data.result_ratio)}` : " - "}
          </div>
          <div className="text-center">
            {Number(data.bet_amount).toFixed(2)}
          </div>
          <div
            className={`text-center font-bold ${
              Number(data.actual_win_lose_amount) >= 0
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {Number(data.actual_win_lose_amount).toFixed(2)}
          </div>
        </div>
        {data.game_round_cards !== null && (
          <div className="bg-black/30 p-8 flex justify-center gap-8 flex-wrap">
            {gameType === "LONGHU" &&
              (() => {
                const lhCards = rawCards as { dragon: string; tiger: string };
                const dragonResult = getCardRankValue(lhCards.dragon);
                const tigerResult = getCardRankValue(lhCards.tiger);

                return (
                  <div className="flex flex-col items-center w-full py-10">
                    <div className="bg-black w-200">
                      <div className="flex w-full h-14 overflow-hidden">
                        <div
                          className={cn(
                            "bg-red-600 flex items-center justify-center text-white text-5xl font-bold w-full py-2",
                            dragonResult > tigerResult &&
                              "ring-2 ring-inset ring-yellow-400",
                          )}
                          style={{
                            clipPath: "polygon(0 0, 100% 0, 96% 100%, 0% 100%)",
                            marginRight: "-4%",
                          }}
                        >
                          <span>龙</span>
                          <span className="ml-6">{dragonResult}</span>
                        </div>
                        <div
                          className={cn(
                            "bg-blue-600 flex items-center justify-center text-white text-5xl font-bold w-full py-2",
                            tigerResult > dragonResult &&
                              "ring-2 ring-inset ring-yellow-400",
                          )}
                          style={{
                            clipPath:
                              "polygon(4% 0, 100% 0, 100% 100%, 0 100%)",
                          }}
                        >
                          <div>
                            <span className="mr-6">{tigerResult}</span>
                            <span>虎</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-60 p-10">
                        <div className="flex flex-col items-center gap-4">
                          <img
                            src={`/images/cards/${lhCards.dragon}.jpg`}
                            className="w-32 h-44 rounded-xl shadow-2xl animate-slideDown"
                          />
                        </div>
                        <div className="flex flex-col items-center gap-4">
                          <img
                            src={`/images/cards/${lhCards.tiger}.jpg`}
                            className="w-32 h-44 rounded-xl shadow-2xl animate-slideDown"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {gameType === "BACCARAT" &&
              baccaratType === "G" &&
              (() => {
                const playerResult = calculateBaccaratScore(player1);
                const bankerResult = calculateBaccaratScore(banker);
                return (
                  <div className="flex flex-col items-center w-full py-10">
                    <div className="bg-black w-full">
                      <div className="flex w-full overflow-hidden">
                        <div
                          className={cn(
                            "bg-blue-600 flex items-center justify-center text-white text-5xl font-bold w-full py-2",
                          )}
                          style={{
                            clipPath: "polygon(0 0, 100% 0, 96% 100%, 0% 100%)",
                            marginRight: "-4%",
                          }}
                        >
                          <span className="mr-4">闲</span>
                          <span>{playerResult}</span>
                        </div>
                        <div
                          className={cn(
                            "bg-red-600 flex items-center justify-center text-white text-5xl font-bold w-full py-2",
                          )}
                          style={{
                            clipPath:
                              "polygon(4% 0, 100% 0, 100% 100%, 0 100%)",
                          }}
                        >
                          <div>
                            <span className="mr-4">庄</span>
                            <span>{bankerResult}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-60 py-5">
                        {player1.length > 0 && (
                          <div className="flex flex-col items-center gap-3 w-70">
                            <div className="flex flex-wrap justify-center gap-3">
                              {player1.map((c, i) => (
                                <img
                                  key={i}
                                  src={`/images/cards/${c}.jpg`}
                                  className="w-30 rounded animate-slideDown"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        {banker.length > 0 && (
                          <div className="flex flex-col items-center gap-3 w-70">
                            <div className="flex gap-3 flex-wrap justify-center">
                              {banker.map((c, i) => (
                                <img
                                  key={i}
                                  src={`/images/cards/${c}.jpg`}
                                  className="w-30 rounded animate-slideDown"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {gameType === "NIUNIU" && (
              <div className="flex flex-col w-full gap-6">
                <div className="flex justify-center items-center gap-10 pb-6 border-b border-white/10">
                  {firstCard && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="border-2 border-green-500 p-1 rounded-lg bg-green-900/20">
                        <img
                          src={`/images/cards/${firstCard}.jpg`}
                          className="w-16 h-24 md:w-24 md:h-36 rounded animate-slideDown shadow-lg object-cover"
                          alt="First Card"
                        />
                      </div>
                    </div>
                  )}

                  {banker.length > 0 && (
                    <NiuPlayer
                      title="庄"
                      variant="banker"
                      cards={banker}
                      label={formatHandText(banker)}
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {(["player1", "player2", "player3"] as const).map(
                    (seatKey, index) => {
                      const seatCards = cards[seatKey];
                      if (seatCards.length === 0) return null;

                      const result = getSeatResult(seatKey);

                      return (
                        <NiuPlayer
                          key={seatKey}
                          title={`${index + 1}`}
                          cards={seatCards}
                          label={result.text}
                        />
                      );
                    },
                  )}
                </div>
              </div>
            )}
            {player1.length +
              player2.length +
              player3.length +
              banker.length ===
              0 && <div className="text-gray-400 text-xl italic"></div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDialog;

/** Displays a single profile row with label and value. */
const ProfileRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex text-xl">
    <div className="w-32 text-yellow-200">{label}</div>
    <div className="text-white">{value}</div>
  </div>
);

/** Renders a Niuniu player's cards with title and hand type label (banker or player variant). */
const NiuPlayer = ({
  title,
  cards,
  label,
  variant = "player",
}: {
  title: string;
  cards: string[];
  label?: string;
  variant?: "banker" | "player";
}) => {
  const borderColor =
    variant === "banker" ? "border-red-500" : "border-blue-500";
  const bgColor = variant === "banker" ? "bg-red-900/10" : "bg-blue-900/10";
  const textColor = variant === "banker" ? "text-red-500" : "text-blue-500";

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-2 border-2 rounded-xl ${borderColor} ${bgColor} h-full`}
    >
      <div className="flex flex-wrap justify-center items-center gap-5 w-full">
        {cards.map((c, i) => (
          <img
            key={i}
            src={`/images/cards/${c}.jpg`}
            className="w-16 h-24 md:w-24 md:h-36 rounded animate-slideDown shadow-lg object-cover"
            alt="card"
          />
        ))}
        <div className="flex flex-col justify-center items-center w-16 h-24 md:w-24 md:h-36">
          <span className={`text-3xl font-black italic ${textColor}`}>
            {title}
          </span>
          {label && (
            <span className="text-white text-2xl font-bold mt-1 drop-shadow-md">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
