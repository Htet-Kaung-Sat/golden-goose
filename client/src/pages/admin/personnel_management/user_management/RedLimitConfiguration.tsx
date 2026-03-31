import { getUsers } from "@/api/admin/user";
import {
  getUpperUserRateLimits,
  mergeUserRateLimits,
} from "@/api/admin/user-rate-limit";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { NewUserRateLimitSave, RateLimitData } from "@/types";
import { Role } from "@/types/Role";
import CheckboxField from "@/components/shared/CheckboxField";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicIp } from "@/utils/PublicIp";
import { AxiosError } from "axios";

type FormValues = {
  account: string;
  role_name: string;
};

/**
 * Red limit configuration tab: set bet rate limits per game for user.
 */
const RedLimitConfiguration = () => {
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitData[]>([]);
  const [selectedRateLimits, setSelectedRateLimits] = useState<
    Record<number, number>
  >({});
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<
    Record<number, boolean>
  >({});
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [path, setPath] = useState("");
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorMessage,
    setErrorFromResponse,
  } = useAuthGuard();
  const { isLoading, setIsLoading } = useLoading();
  const { pathname } = useLocation();
  const fallbackPath = pathname.includes("agent")
    ? "/admin/user_management/agent"
    : pathname.includes("member")
      ? "/admin/user_management/member"
      : "/admin/user_search";
  const validatedId = useValidatedIdParam(fallbackPath);
  const navigate = useNavigate();
  const didFetch = useRef(false);
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const marginLeft = isEn ? "ml-7" : "ml-10";

  const { register, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      account: "",
      role_name: "",
    },
  });

  const fetchInit = useCallback(async () => {
    if (!validatedId) return;
    try {
      setIsLoading(true);
      const payload = {
        id: validatedId,
        include: "role,userRateLimits",
      };
      const res = await getUsers(payload);
      setUserRole(res.data.users?.[0]?.role ?? null);
      setValue("account", String(res.data.users?.[0]?.account));
      setValue("role_name", res.data.users?.[0]?.role?.chinese_name ?? "");
      const res1 = await getUpperUserRateLimits({
        account: String(res.data.users?.[0]?.creator_account),
      });
      setRateLimits(res1.data.rateLimits);
      const initialRadios: Record<number, number> = {};
      const initialCheckboxes: Record<number, boolean> = {};
      res1.data.rateLimits.forEach((item) => {
        const exists =
          res.data.users?.[0]?.userRateLimits?.some(
            (u) => u.rate_limit_id === item.rate_limit_id,
          ) ?? false;
        if (exists) {
          initialRadios[item.game_id] = item.rate_limit_id;
        }
        initialCheckboxes[item.rate_limit_id] = exists;
      });
      setSelectedRateLimits(initialRadios);
      setSelectedCheckboxes(initialCheckboxes);
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [validatedId, setValue, setErrorFromResponse, setIsLoading]);

  useEffect(() => {
    if (!didFetch.current && validatedId) {
      if (pathname.includes("agent")) {
        setPath("agent");
      } else if (pathname.includes("member")) {
        setPath("member");
      }
      fetchInit();
      didFetch.current = true;
    }
  }, [validatedId, pathname, fetchInit]);

  const groupedBetRates = useMemo(() => {
    const grouped: Record<number, RateLimitData[]> = {};
    rateLimits.forEach((item) => {
      if (!grouped[item.game_id]) {
        grouped[item.game_id] = [];
      }
      grouped[item.game_id].push(item);
    });
    Object.values(grouped).forEach((arr) =>
      arr.sort((a, b) => a.rate_limit_id - b.rate_limit_id),
    );
    return grouped;
  }, [rateLimits]);

  const handleSelectAllBetRates = () => {
    const allRateLimitIds = rateLimits.map((limit) => limit.rate_limit_id);
    const isAllSelected =
      userRole?.name === "agent"
        ? allRateLimitIds.every((id) => selectedCheckboxes[id])
        : Object.keys(groupedBetRates).length ===
          Object.keys(selectedRateLimits).length;
    if (isAllSelected) {
      setSelectedCheckboxes({});
    } else {
      const newCheckboxes: Record<number, boolean> = {};
      rateLimits.forEach((item) => {
        newCheckboxes[item.rate_limit_id] = true;
      });
      setSelectedCheckboxes(newCheckboxes);
    }
  };

  const onSubmitValidate = () => setConfirmDialogOpen(true);

  const onSubmit = async () => {
    setConfirmDialogOpen(false);
    for (const [gameIdStr, rates] of Object.entries(groupedBetRates)) {
      const gameId = Number(gameIdStr);
      if (userRole?.name === "member") {
        if (!selectedRateLimits[gameId]) {
          if (rates[0].game_name === "牛牛") {
            setErrorMessage(`${t("rlc_rate_message")}${t("rlc_niuniu")}`);
          } else if (rates[0].game_name === "百家乐") {
            setErrorMessage(`${t("rlc_rate_message")}${t("rlc_baccarat")}`);
          } else if (rates[0].game_name === "龙虎斗") {
            setErrorMessage(`${t("rlc_rate_message")}${t("rlc_longhu")}`);
          }
          setErrorDialogOpen(true);
          return false;
        }
      } else {
        const hasChecked = rates.some(
          (r) => selectedCheckboxes[r.rate_limit_id],
        );
        if (!hasChecked) {
          if (rates[0].game_name === "牛牛") {
            setErrorMessage(`${t("rlc_rate_message")}${t("rlc_niuniu")}`);
          } else if (rates[0].game_name === "百家乐") {
            setErrorMessage(`${t("rlc_rate_message")}${t("rlc_baccarat")}`);
          } else if (rates[0].game_name === "龙虎斗") {
            setErrorMessage(`${t("rlc_rate_message")}${t("rlc_longhu")}`);
          }
          setErrorDialogOpen(true);
          return false;
        }
      }
    }
    if (!validatedId) return;
    setIsLoading(true);
    try {
      const ip_location = await getPublicIp();
      const payload: NewUserRateLimitSave =
        userRole?.name === "member"
          ? {
              user_id: validatedId,
              ip_location: ip_location,
              screen_name: "限红配置",
              rate_limits: Object.entries(selectedRateLimits).map(
                ([, rate_limit_id]) => ({
                  rate_limit_id,
                }),
              ),
            }
          : {
              user_id: validatedId,
              ip_location: ip_location,
              screen_name: "限红配置",
              rate_limits: Object.keys(selectedCheckboxes)
                .filter(
                  (rate_limit_id) => selectedCheckboxes[Number(rate_limit_id)],
                )
                .map((rate_limit_id) => ({
                  rate_limit_id: Number(rate_limit_id),
                })),
            };
      const result = await mergeUserRateLimits(payload);
      setIsLoading(false);
      if (result.success) {
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const displayMessage = String(data?.message ?? t("rlc_error_message"));
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
      setIsLoading(false);
    }
  };

  return (
    <div>
      <fieldset disabled={isLoading}>
        <form onSubmit={handleSubmit(onSubmitValidate)}>
          <div className="flex flex-col gap-8 mb-8">
            <div>
              <InputField
                id="account"
                label={t("rlc_account")}
                required={false}
                readOnly
                registerProps={register("account")}
                inputClassName="w-70"
              />
            </div>
            <div>
              <InputField
                id="role_name"
                label={t("rlc_role_name")}
                required={false}
                readOnly
                registerProps={register("role_name")}
                inputClassName="w-70"
              />
            </div>
            <div className="flex items-center gap-4">
              <h3 className="font-medium">{t("rlc_bet_range")}</h3>
              {userRole?.name === "agent" && (
                <Button
                  type="button"
                  variant="info"
                  size="sm"
                  className={`h-7 px-2 text-xs ${marginLeft}`}
                  onClick={handleSelectAllBetRates}
                >
                  {t("rlc_select_all")}
                </Button>
              )}
            </div>
            {Object.entries(groupedBetRates).map(([gameIdStr, rates]) => {
              const gameId = Number(gameIdStr);
              const gameName = rates[0].game_name;
              const handleToggleGameAll = () => {
                const allIdsInRow = rates.map((r) => r.rate_limit_id);
                const isLineAllSelected = allIdsInRow.every(
                  (id) => !!selectedCheckboxes[id],
                );
                setSelectedCheckboxes((prev) => {
                  const next = { ...prev };
                  allIdsInRow.forEach((id) => {
                    next[id] = !isLineAllSelected;
                  });
                  return next;
                });
              };
              return (
                <div
                  key={gameId}
                  className="flex flex-wrap gap-4 text-center items-center"
                >
                  <div className="flex items-center gap-2 w-40">
                    <Label className="text-sm font-medium w-full">
                      {gameName === "牛牛"
                        ? t("rlc_niuniu")
                        : gameName === "百家乐"
                          ? t("rlc_baccarat")
                          : gameName === "龙虎斗"
                            ? t("rlc_longhu")
                            : gameName}
                    </Label>

                    {userRole?.name === "agent" && (
                      <Button
                        type="button"
                        variant="info"
                        size="sm"
                        className="h-5 px-2 text-xs"
                        onClick={handleToggleGameAll}
                      >
                        {t("rlc_select_all")}
                      </Button>
                    )}
                  </div>
                  {userRole?.name === "member" ? (
                    <RadioGroup
                      value={selectedRateLimits[gameId]?.toString() || ""}
                      onValueChange={(val) =>
                        setSelectedRateLimits((prev) => ({
                          ...prev,
                          [gameId]: Number(val),
                        }))
                      }
                      orientation="horizontal"
                    >
                      {rates.map((rate) => (
                        <div
                          key={rate.rate_limit_id}
                          className="flex flex-wrap items-center gap-3"
                        >
                          <RadioGroupItem
                            value={rate.rate_limit_id.toString()}
                            id={`rate-${gameId}-${rate.rate_limit_id}`}
                          />
                          <Label
                            htmlFor={`rate-${gameId}-${rate.rate_limit_id}`}
                          >
                            {rate.bet_rate}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {rates.map((rate) => (
                        <div
                          key={rate.rate_limit_id}
                          className="flex flex-wrap items-center gap-3"
                        >
                          <CheckboxField
                            checked={!!selectedCheckboxes[rate.rate_limit_id]}
                            onCheckedChange={(checked) =>
                              setSelectedCheckboxes((prev) => ({
                                ...prev,
                                [rate.rate_limit_id]: Boolean(checked),
                              }))
                            }
                            id={`checkbox-${rate.rate_limit_id}`}
                          />
                          <Label htmlFor={`checkbox-${rate.rate_limit_id}`}>
                            {rate.bet_rate}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="info" type="submit" disabled={isLoading}>
              {isLoading ? (
                <Icons.loader2 className="animate-spin" />
              ) : (
                <Icons.save />
              )}
              {t("common_submit")}
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={() => {
                if (pathname.includes("user_search")) {
                  navigate(`/admin/user_search`);
                } else {
                  navigate(`/admin/user_management/${path}`);
                }
              }}
            >
              <Icons.cross />
              {t("common_destructive")}
            </Button>
          </div>
        </form>
      </fieldset>
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        status="fail"
        message={errorMessage ?? ""}
      />
      <ConfirmDialog
        open={successDialogOpen}
        onClose={() => {
          setSuccessDialogOpen(false);
        }}
        status="success"
        message={t("rlc_success_modify")}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={onSubmit}
        status="confirm"
      />
    </div>
  );
};

export default RedLimitConfiguration;
