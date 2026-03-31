import { getRoles } from "@/api/admin/role";
import { createUser, getUsers } from "@/api/admin/user";
import {
  getUpperUserRateLimits,
  saveUserRateLimits,
} from "@/api/admin/user-rate-limit";
import AgentTree from "@/components/shared/AgentTree";
import CheckboxField from "@/components/shared/CheckboxField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLoading } from "@/contexts/useLoading";
import { useUserManagement } from "@/contexts/UserManagementContext";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { NewUserRateLimitSave, RateLimitData } from "@/types";
import { Role } from "@/types/Role";
import { User } from "@/types/User";
import { getPublicIp } from "@/utils/PublicIp";
import { NewUserSchema } from "@/validation/admin/NewUserSchema";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { AxiosError } from "axios";
import { usePasswordConfirmRevalidate } from "@/hooks/usePasswordConfirmRevalidate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { InferType } from "yup";

/**
 * New user tab: create member under selected agent; form with bet rates and game limits.
 */
const NewUser = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [rateLimits, setRateLimits] = useState<RateLimitData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [creator, setCreator] = useState<User | null>(null);
  const [roleId, setRoleId] = useState<number | string>("");
  const [selectedRoleName, setSelectedRoleName] = useState<string | null>(
    "agent",
  );
  const [selectedBetRates, setSelectedBetRates] = useState<
    Record<number, number[]>
  >({});
  const [tempBetRates, setTempBetRates] = useState<Record<number, number[]>>(
    {},
  );
  const [betRateError, setBetRateError] = useState(false);
  const [formDataCache, setFormDataCache] = useState<FormValues | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorMessage,
    setErrorFromResponse,
  } = useAuthGuard();
  const { isLoading, setIsLoading } = useLoading();
  const { selected } = useUserManagement();
  const didFetch = useRef(false);
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-36" : "md:w-20";
  const dynamicLabelWidth1 = isEn ? "md:w-20" : "md:w-14";
  type FormValues = InferType<typeof NewUserSchema> & {
    share_type?: boolean;
    share_rate?: number | null | undefined;
    display_bonus?: boolean;
  };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, touchedFields, dirtyFields, isSubmitted },
    reset,
    watch,
    trigger,
  } = useForm<FormValues>({
    resolver: yupResolver(NewUserSchema) as unknown as Resolver<FormValues>,
    mode: "onChange",
    defaultValues: {
      creator_account: loginUser?.account,
      account: "",
      name: "",
      password: "",
      password_confirmation: "",
      role_id: "agent",
      bonus_type: "both",
      bonus_rate: undefined,
      share_type: true,
      share_rate: undefined,
      display_bonus: true,
    },
  });

  const password = watch("password");
  usePasswordConfirmRevalidate(
    password,
    "password_confirmation",
    trigger as (name?: string) => Promise<boolean>,
  );

  const fetchUser = useCallback(
    async (account: string) => {
      try {
        const res = await getUsers({ account: account });
        const user = res?.data?.users?.[0];
        setCreator(user);
        setValue("bonus_type", user?.bonus_type || "both");
        setValue("bonus_rate", parseFloat(String(user?.bonus_rate)) || 0.9, {
          shouldValidate: true,
        });
        setValue("share_type", user?.share_type);
        const shareRate = user?.share_rate ?? 0;
        setValue("share_rate", shareRate > 99 ? 99 : shareRate, {
          shouldValidate: true,
        });
      } catch (error) {
        setErrorFromResponse(error);
        setIsLoading(false);
      }
    },
    [setValue, setErrorFromResponse, setIsLoading],
  );

  const fetchRateLimit = useCallback(
    async (account: string) => {
      try {
        const res = await getUpperUserRateLimits({ account: account });
        setRateLimits(res.data.rateLimits);
        await fetchUser(account);
      } catch (error) {
        setErrorFromResponse(error);
        setIsLoading(false);
      }
    },
    [fetchUser, setErrorFromResponse, setIsLoading],
  );

  const fetchInit = useCallback(
    async (account: string) => {
      try {
        await fetchRateLimit(account);
        const res = await getRoles({
          roleNames: "agent, member",
          order: "name",
        });
        setRoles(res.data.roles || []);
        const initialRole = res.data.roles.find((r) => r.name === "agent");
        setRoleId(Number(initialRole?.id));
        setValue("role_id", String(initialRole?.name));
        setIsLoading(false);
      } catch (error) {
        setErrorFromResponse(error);
        setIsLoading(false);
      }
    },
    [fetchRateLimit, setValue, setErrorFromResponse, setIsLoading],
  );

  useEffect(() => {
    if (!didFetch.current) {
      fetchInit(String(loginUser?.account ?? ""));
      didFetch.current = true;
    }
  }, [loginUser?.account, fetchInit]);

  const currentShareType = watch("share_type");

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
    const currentlySelectedIds = Object.values(selectedBetRates).flat();
    const isAllSelected =
      allRateLimitIds.length === currentlySelectedIds.length;
    if (isAllSelected) {
      setSelectedBetRates({});
    } else {
      const newSelection: Record<number, number[]> = {};
      rateLimits.forEach((item) => {
        if (!newSelection[item.game_id]) {
          newSelection[item.game_id] = [];
        }
        newSelection[item.game_id].push(item.rate_limit_id);
      });
      setSelectedBetRates(newSelection);
    }
  };

  const onSubmitValidate = (data: FormValues) => {
    if (Number(data.bonus_rate) > Number(creator?.bonus_rate)) {
      setErrorMessage(
        `${t("nu_bonus_error")}(${parseFloat(String(creator?.bonus_rate))})`,
      );
      setErrorDialogOpen(true);
      return;
    }
    if (Number(data.share_rate) > Number(creator?.share_rate)) {
      setErrorMessage(`${t("nu_share_error")}(${creator?.share_rate})`);
      setErrorDialogOpen(true);
      return;
    }
    setConfirmDialogOpen(true);
    setFormDataCache(data);
  };

  const onSubmit = async () => {
    setConfirmDialogOpen(false);
    for (const [gameIdStr, rates] of Object.entries(groupedBetRates)) {
      const gameId = Number(gameIdStr);
      const selected = selectedBetRates[gameId];
      if (!selected || selected.length === 0) {
        if (rates[0].game_name === "牛牛") {
          setErrorMessage(`${t("nu_rate_message")}${t("nu_niuniu")}`);
        } else if (rates[0].game_name === "百家乐") {
          setErrorMessage(`${t("nu_rate_message")}${t("nu_baccarat")}`);
        } else if (rates[0].game_name === "龙虎斗") {
          setErrorMessage(`${t("nu_rate_message")}${t("nu_longhu")}`);
        }
        setErrorDialogOpen(true);
        setBetRateError(true);
        setTempBetRates(selectedBetRates);
        return;
      }
    }
    setIsLoading(true);
    try {
      const betRates = Object.values(selectedBetRates).flat();
      const payload: User = {
        role_id: Number(roleId),
        creator_account: String(formDataCache?.creator_account),
        account: String(formDataCache?.account),
        name: String(formDataCache?.name),
        password: String(formDataCache?.password),
        level: creator?.level ? creator?.level + 1 : 1,
        bonus_type: String(formDataCache?.bonus_type),
        bonus_rate: Number(formDataCache?.bonus_rate),
      };
      if (selectedRoleName === "agent") {
        if (formDataCache?.share_type) {
          payload.share_type = formDataCache?.share_type;
          payload.share_rate = Number(formDataCache?.share_rate);
        } else {
          payload.share_type = formDataCache?.share_type;
        }
      } else {
        payload.display_bonus = formDataCache?.display_bonus;
      }
      const result = await createUser(payload);
      const createdId = Number(result.data.user.id);
      const ip_location = await getPublicIp();
      const rateLimitPayload: NewUserRateLimitSave = {
        user_id: createdId,
        ip_location: ip_location,
        screen_name: "添加用户",
        rate_limits: betRates.map((id) => ({ rate_limit_id: id })),
      };
      const response = await saveUserRateLimits(rateLimitPayload);
      setIsLoading(false);
      if (response.success) {
        reset();
        setSelectedBetRates({});
        setSelectedRoleName("agent");
        handleAgentSearch(String(selected));
        setSuccessDialogOpen(true);
        setRefreshTrigger((prev) => prev + 1);
        const initialRole = roles.find((r) => r.name === "agent");
        setRoleId(Number(initialRole?.id));
        setValue("role_id", String(initialRole?.name));
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const displayMessage = String(data?.message ?? t("nu_fail_massage"));
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
      setIsLoading(false);
    }
  };

  const handleAgentSearch = useCallback(
    async (account: string) => {
      setValue("creator_account", account);
      await fetchRateLimit(account);
      if (betRateError) {
        setSelectedBetRates(tempBetRates);
        setBetRateError(false);
        setTempBetRates({});
      } else {
        setSelectedBetRates({});
      }
    },
    [fetchRateLimit, setValue, betRateError, tempBetRates],
  );

  return (
    <div>
      <fieldset disabled={isLoading}>
        <form onSubmit={handleSubmit(onSubmitValidate)}>
          <div className="flex flex-wrap gap-16 my-3">
            <div className="flex flex-col gap-8">
              <InputField
                id="creator_account"
                label={t("nu_creator_account")}
                labelWidth={dynamicLabelWidth}
                defaultValue={loginUser?.account || ""}
                required={true}
                inputWidth="w-70"
                inputClassName="flex flex-col"
                registerProps={register("creator_account")}
                readOnly
                error={translateError(
                  t,
                  "nu_creator_account",
                  errors.creator_account,
                )}
              />
              <InputField
                id="account"
                label={t("nu_account")}
                labelWidth={dynamicLabelWidth}
                inputWidth="w-70"
                required={true}
                placeholder={t("nu_acc_holder")}
                registerProps={register("account")}
                error={translateError(t, "nu_account", errors.account)}
              />
              <InputField
                id="name"
                label={t("nu_name")}
                labelWidth={dynamicLabelWidth}
                inputWidth="w-70"
                required={true}
                registerProps={register("name")}
                error={translateError(t, "nu_name", errors.name)}
              />
              <InputField
                id="password"
                label={t("nu_password")}
                labelWidth={dynamicLabelWidth}
                type="password"
                required={true}
                placeholder={t("nu_password_holder")}
                inputWidth="w-70"
                registerProps={register("password")}
                error={
                  isSubmitted || touchedFields.password || dirtyFields.password
                    ? translateError(t, "nu_password", errors.password)
                    : undefined
                }
              />
              <InputField
                id="password_confirmation"
                label={t("nu_confirm_password")}
                labelWidth={dynamicLabelWidth}
                type="password"
                required={true}
                inputWidth="w-70"
                registerProps={register("password_confirmation")}
                error={
                  isSubmitted ||
                  touchedFields.password_confirmation ||
                  dirtyFields.password_confirmation
                    ? translateError(
                        t,
                        "nu_confirm_password",
                        errors.password_confirmation,
                      )
                    : undefined
                }
              />
              <SelectField
                id="role_id"
                label={t("nu_identity")}
                labelWidth={dynamicLabelWidth}
                value={String(selectedRoleName || "")}
                options={roles.map((d) => ({
                  value: String(d.name),
                  label:
                    d.chinese_name === "代理"
                      ? t("nu_agent")
                      : d.chinese_name === "会员"
                        ? t("nu_member")
                        : d.chinese_name,
                }))}
                required={true}
                selectWidth="w-70"
                selectClassName="h-10"
                register={register("role_id")}
                onChange={(val) => {
                  const selectedRole = roles.find((r) => r.name === val);
                  setSelectedRoleName(val);
                  setRoleId(Number(selectedRole?.id));
                  setSelectedBetRates({});
                  setIsLoading(false);
                  if (val === "member") {
                    setValue("display_bonus", true, {
                      shouldValidate: true,
                    });
                    setValue("share_type", undefined, {
                      shouldValidate: true,
                    });
                    setValue("share_rate", undefined, {
                      shouldValidate: true,
                    });
                  } else {
                    setValue("display_bonus", undefined, {
                      shouldValidate: true,
                    });
                    setValue("share_type", creator?.share_type, {
                      shouldValidate: true,
                    });
                    setValue(
                      "share_rate",
                      creator?.share_rate != null
                        ? creator.share_rate > 99
                          ? 99
                          : creator.share_rate
                        : undefined,
                      {
                        shouldValidate: true,
                      },
                    );
                  }
                }}
                error={translateError(t, "nu_identity", errors.role_id)}
              />
            </div>
            <div className="flex flex-col gap-3">
              <div className="mb-3">
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="font-medium">{t("nu_bet_range")}</h3>
                  {selectedRoleName === "agent" && (
                    <Button
                      type="button"
                      variant="info"
                      size="sm"
                      className="h-7 px-3"
                      onClick={handleSelectAllBetRates}
                    >
                      {t("nu_select_all")}
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-5">
                  {Object.entries(groupedBetRates).map(([gameIdStr, rates]) => {
                    const gameId = Number(gameIdStr);
                    const gameName = rates[0].game_name;
                    const handleToggleGameAll = () => {
                      setSelectedBetRates((prev) => {
                        const isGameAllSelected =
                          prev[gameId]?.length === rates.length;
                        return {
                          ...prev,
                          [gameId]: isGameAllSelected
                            ? []
                            : rates.map((r) => r.rate_limit_id),
                        };
                      });
                    };

                    return (
                      <div
                        key={gameId}
                        className="flex flex-col sm:flex-row sm:items-start sm:gap-12 sm:md:w-full"
                      >
                        <div className="flex items-center gap-5">
                          <Label className="text-sm font-medium w-full sm:w-15 md:w-15 lg:w-15">
                            {gameName === "牛牛"
                              ? t("nu_niuniu")
                              : gameName === "百家乐"
                                ? t("nu_baccarat")
                                : gameName === "龙虎斗"
                                  ? t("nu_longhu")
                                  : gameName}
                          </Label>
                          {selectedRoleName === "agent" && (
                            <Button
                              type="button"
                              variant="info"
                              size="sm"
                              className="h-5 px-2 text-xs"
                              onClick={handleToggleGameAll}
                            >
                              {t("nu_select_all")}
                            </Button>
                          )}
                        </div>
                        <div className="flex-1">
                          {selectedRoleName !== "agent" ? (
                            <div className="mb-2">
                              <RadioGroup
                                value={
                                  selectedBetRates[gameId]?.[0]?.toString() ||
                                  ""
                                }
                                onValueChange={(val) =>
                                  setSelectedBetRates((prev) => ({
                                    ...prev,
                                    [gameId]: [Number(val)],
                                  }))
                                }
                                orientation="horizontal"
                                className="flex flex-wrap gap-3"
                              >
                                {rates.map((rate) => (
                                  <div
                                    key={rate.rate_limit_id}
                                    className="flex items-center gap-2"
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
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-4">
                              {rates.map((rate) => {
                                const isChecked =
                                  selectedBetRates[gameId]?.includes(
                                    rate.rate_limit_id,
                                  ) || false;

                                return (
                                  <CheckboxField
                                    key={rate.rate_limit_id}
                                    id={`checkbox-${gameId}-${rate.rate_limit_id}`}
                                    label={rate.bet_rate}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      setSelectedBetRates((prev) => {
                                        const current = prev[gameId] || [];
                                        return {
                                          ...prev,
                                          [gameId]: checked
                                            ? [...current, rate.rate_limit_id]
                                            : current.filter(
                                                (id) =>
                                                  id !== rate.rate_limit_id,
                                              ),
                                        };
                                      });
                                    }}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mb-3">
                <Label className="block mb-3">{t("nu_bonus_type")}</Label>
                <Controller
                  name="bonus_type"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      {...field}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      orientation="horizontal"
                      id="bonus_type"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="single" id="unilateral" />
                        <Label htmlFor="unilateral">{t("nu_bonus_one")}</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value="both" id="bilateral" />
                        <Label htmlFor="bilateral">{t("nu_bonus_two")}</Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>
              <div className="flex md:flex-row lg:flex-row sm:flex-col sm:items-start lg:justify-start lg:items-end w-full">
                <div>
                  <InputField
                    id="bonus_rate"
                    label={t("nu_bonus")}
                    labelWidth={dynamicLabelWidth1}
                    required={false}
                    registerProps={register("bonus_rate")}
                    error={translateError(t, "nu_bonus", errors.bonus_rate)}
                  />
                  <div className="text-sm text-end whitespace-nowrap">
                    {t("nu_creator_bonus")}{" "}
                    {parseFloat(String(creator?.bonus_rate))}%
                  </div>
                </div>
              </div>
              {selectedRoleName !== "member" ? (
                <div className="mt-1">
                  <Label className="block mb-2">{t("nu_share_type")}</Label>
                  <Controller
                    name="share_type"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value ? "1" : "0"}
                        onValueChange={(val) => field.onChange(val === "1")}
                        orientation="horizontal"
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="0" id="realpoint" />
                          <Label htmlFor="realpoint">
                            {t("nu_share_false")}
                          </Label>
                        </div>
                        {creator?.share_type && (
                          <div className="flex items-center gap-3">
                            <RadioGroupItem value="1" id="proportional" />
                            <Label htmlFor="proportional">
                              {t("nu_share_true")}
                            </Label>
                          </div>
                        )}
                      </RadioGroup>
                    )}
                  />
                </div>
              ) : (
                <div className="mt-1">
                  <Label className="block mb-2">{t("nu_display_bonus")}</Label>
                  <Controller
                    name="display_bonus"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={(val) => field.onChange(val === "1")}
                        value={field.value ? "1" : "0"}
                        orientation="horizontal"
                        id="display_bonus_group"
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="1" id="yes" />
                          <Label htmlFor="yes">
                            {t("nu_display_bonus_yes")}
                          </Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="0" id="no" />
                          <Label htmlFor="no">{t("nu_display_bonus_no")}</Label>
                        </div>
                      </RadioGroup>
                    )}
                  />
                </div>
              )}
              {currentShareType === true && selectedRoleName !== "member" ? (
                <div className="flex md:flex-row lg:flex-row sm:flex-col sm:items-start lg:justify-start lg:items-end w-full">
                  <div>
                    <InputField
                      id="share_rate"
                      label={t("nu_share")}
                      labelWidth={dynamicLabelWidth1}
                      required={false}
                      registerProps={register("share_rate")}
                      error={translateError(t, "nu_share", errors.share_rate)}
                    />
                    <div className="text-sm text-end whitespace-nowrap">
                      {t("nu_creator_share")}
                      {creator?.share_rate}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center w-full gap-2"></div>
              )}
            </div>
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
          </div>
        </form>
      </fieldset>
      <AgentTree onSearch={handleAgentSearch} refreshTrigger={refreshTrigger} />
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
        message={t("nu_success_message")}
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

export default NewUser;
