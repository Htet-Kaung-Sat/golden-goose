import { getUser } from "@/api/admin/user";
import { getBetRateLimits } from "@/api/admin/user-rate-limit";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { BetRateLimit } from "@/types";
import { User } from "@/types/User";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Account information: displays current login user profile and bet rate limits.
 */
const AccountInformation = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [user, setUser] = useState<User | null>(null);
  const [betRateLimits, setBetRateLimits] = useState<BetRateLimit[] | null>(
    null,
  );
  const didFetch = useRef(false);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn
    ? "w-44 shrink-0 font-medium"
    : "w-32 shrink-0 font-medium";

  /** Fetches current user and bet rate limits. */
  const fetchInit = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getUser(Number(loginUser?.id));
      setUser(data);
      const result = await getBetRateLimits({ id: Number(loginUser?.id) });
      setBetRateLimits(result.data.betRateLimits);
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [loginUser?.id, setErrorFromResponse, setIsLoading]);

  useEffect(() => {
    if (!didFetch.current) {
      fetchInit();
      didFetch.current = true;
    }
  }, [fetchInit]);

  /** Single label-value row for account info (optional percent format). */
  const InfoRow = ({
    label,
    value,
    isPercent,
  }: {
    label: string;
    value: string | number | null | undefined;
    isPercent?: boolean;
  }) => (
    <div className="flex py-1 items-start">
      <div className={dynamicLabelWidth}>{label}</div>
      <div className="flex-1 break-all">
        {value !== null && value !== undefined
          ? isPercent
            ? `${value}%`
            : value
          : "-"}
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full p-1">
        {!user ? null : (
          <>
            <InfoRow label={t("ai_id")} value={user.id} />
            <InfoRow label={t("ai_account")} value={user.account} />
            <InfoRow label={t("ai_name")} value={user.name} />
            <InfoRow
              label={t("ai_account_status")}
              value={
                user.state === "suspension"
                  ? t("common_suspension")
                  : user.state === "freeze"
                    ? t("common_freeze")
                    : user.locking === "locking"
                      ? t("common_locking")
                      : t("common_normal")
              }
            />
            <InfoRow label={t("ai_balance")} value={user.balance} />
            <InfoRow
              label={t("ai_register_time")}
              value={formatLocalDateTime(String(user?.createdAt))}
            />
            <InfoRow
              label={t("ai_share_rate")}
              value={parseFloat(String(user.share_rate))}
              isPercent
            />
            <InfoRow
              label={t("ai_share_type")}
              value={user.share_type ? t("ai_share_true") : t("ai_share_false")}
            />
            <InfoRow
              label={t("ai_bonus_rate")}
              value={parseFloat(String(user.bonus_rate))}
              isPercent
            />
            <InfoRow
              label={t("ai_bonus_type")}
              value={
                user.bonus_type === "both"
                  ? t("ai_bonus_two")
                  : t("ai_bonus_one")
              }
            />
          </>
        )}

        <h2 className="font-bold text-xl mb-2 mt-4">{t("ai_bet_range")}</h2>

        {betRateLimits && (
          <div className="space-y-6">
            {Object.entries(
              betRateLimits.reduce(
                (acc, bet) => {
                  const key = bet.id;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(bet);
                  return acc;
                },
                {} as Record<string, BetRateLimit[]>,
              ),
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([gameName, gameBets]) => {
                const rangeGroups = Object.entries(
                  gameBets.reduce(
                    (acc, bet) => {
                      const key = `${bet.game_min_bet}-${bet.game_max_bet}`;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(bet);
                      return acc;
                    },
                    {} as Record<string, BetRateLimit[]>,
                  ),
                ).sort(([a], [b]) => {
                  const aMin = Number(a.split("-")[0]);
                  const bMin = Number(b.split("-")[0]);
                  return aMin - bMin;
                });

                return (
                  <div key={gameName}>
                    <div className="text-lg">
                      {gameBets[0].game_name === "牛牛"
                        ? t("ai_niuniu")
                        : gameBets[0].game_name === "百家乐"
                          ? t("ai_baccarat")
                          : gameBets[0].game_name === "龙虎斗"
                            ? t("ai_longhu")
                            : ""}
                    </div>

                    {rangeGroups.map(([range, bets]) => (
                      <div className="mb-2" key={range}>
                        <div>{range}</div>

                        <div className="w-full overflow-x-auto">
                          <table className="min-w-max table-auto border text-center">
                            <thead className="text-white bg-black">
                              <tr>
                                {bets.map((bet, index) => (
                                  <th
                                    key={index}
                                    className="border px-2 font-normal whitespace-nowrap"
                                  >
                                    {t(bet.bet_key)}
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody>
                              <tr>
                                {bets.map((bet, index) => (
                                  <td
                                    key={index}
                                    className="border m-0 px-1 font-normal whitespace-nowrap"
                                  >
                                    {bet.result_max_bet}
                                  </td>
                                ))}
                              </tr>
                              <tr>
                                {bets.map((bet, index) => (
                                  <td
                                    key={index}
                                    className="border m-0 px-1 font-normal whitespace-nowrap"
                                  >
                                    {bet.result_min_bet}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};

export default AccountInformation;
