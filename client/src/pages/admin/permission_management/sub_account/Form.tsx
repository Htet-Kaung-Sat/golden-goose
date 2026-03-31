import { getRoles } from "@/api/admin/role";
import { createUser, getUser, updateUser } from "@/api/admin/user";
import CheckboxField from "@/components/shared/CheckboxField";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { User } from "@/types/User";
import { SubAccountSchema } from "@/validation";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { usePasswordConfirmRevalidate } from "@/hooks/usePasswordConfirmRevalidate";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { InferType } from "yup";
import { AxiosError } from "axios";

type FormValues = InferType<typeof SubAccountSchema>;

const PERMISSION_TITLES = [
  { key: "permission_management", value: "permission_management" },
  { key: "personnel_management", value: "personnel_management1" },
  { key: "report_management", value: "report_management" },
  { key: "system_management", value: "system_management" },
];

const PERMISSIONS = [
  {
    parent: "permission_management",
    key: "change_password",
    value: "change_password",
  },
  {
    parent: "personnel_management",
    key: "user_management",
    value: "user_management",
  },
  { parent: "personnel_management", key: "user_search", value: "user_search" },
  {
    parent: "personnel_management",
    key: "player_login_log",
    value: "player_login_log",
  },
  {
    parent: "personnel_management",
    key: "account_information",
    value: "account_information",
  },
  {
    parent: "personnel_management",
    key: "online_player",
    value: "online_player",
  },
  {
    parent: "personnel_management",
    key: "personnel_management",
    value: "personnel_management",
  },
  { parent: "report_management", key: "code_lookup", value: "code_lookup" },
  {
    parent: "report_management",
    key: "summary_report",
    value: "summary_report",
  },
  {
    parent: "report_management",
    key: "tabletop_report",
    value: "tabletop_report",
  },
  { parent: "report_management", key: "boot_report", value: "boot_report" },
  { parent: "report_management", key: "daily_report", value: "daily_report" },
  { parent: "system_management", key: "operation_log", value: "operation_log" },
];

/**
 * Sub-account create/edit form: state, account, name, passwords, day_limit, and permission checkboxes.
 */
const Form = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const validatedId = useValidatedIdParam("/admin/sub_account", {
    required: false,
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [formDataCache, setFormDataCache] = useState<FormValues | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const navigate = useNavigate();
  const { isLoading, setIsLoading } = useLoading();
  const didFetch = useRef(false);
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-36" : "md:w-28";

  const {
    register,
    control,
    reset,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, touchedFields, dirtyFields, isSubmitted },
  } = useForm<FormValues>({
    resolver: yupResolver(SubAccountSchema) as unknown as Resolver<FormValues>,
    mode: "onChange",
    defaultValues: {
      is_update: !!validatedId,
      state: "online",
      account: "",
      name: "",
      login_password: "",
      password: "",
      confirm_password: "",
      day_limit: 0,
      creator_account: loginUser?.login_account || undefined,
    },
  });

  const password = watch("password");
  usePasswordConfirmRevalidate(
    password,
    "confirm_password",
    trigger as (name?: string) => Promise<boolean>,
  );

  /** Fetches sub_account role and sets roleId for create mode. */
  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getRoles({ roleNames: "sub_account" });
      const role = result.data.roles?.find(
        (r: { name?: string }) => r.name === "sub_account",
      );
      setRoleId(role?.id ?? null);
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [setErrorFromResponse, setIsLoading]);

  /** Fetches sub-account by id and resets form and permissions for edit mode. */
  const fetchSubAccount = useCallback(async () => {
    if (!validatedId) return;
    try {
      setIsLoading(true);
      const data = await getUser(validatedId);
      reset({
        is_update: true,
        state: data.state,
        name: data.name,
        account: data.account,
        login_password: "",
        password: "",
        confirm_password: "",
        day_limit: data.day_limit,
        creator_account: data.creator_account,
      });
      setSelectedPermissions(data.permission?.split("|") || []);
      setRoleId(data.role_id ?? null);
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [validatedId, reset, setErrorFromResponse, setIsLoading]);

  useEffect(() => {
    if (!didFetch.current) {
      if (validatedId) {
        fetchSubAccount();
      } else {
        fetchRoles();
      }
      didFetch.current = true;
    }
  }, [validatedId, fetchRoles, fetchSubAccount]);

  const permissionKeys = PERMISSIONS.map((p) => p.key);

  /** Toggles a single permission key in selectedPermissions. */
  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  };

  /** Selects all permissions or clears all. */
  const handleSelectAll = () => {
    if (selectedPermissions.length === permissionKeys.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(permissionKeys);
    }
  };

  const groupedPermissions = useMemo(() => {
    return PERMISSION_TITLES.map((group) => ({
      ...group,
      items: PERMISSIONS.filter((p) => p.parent === group.key),
    }));
  }, []);

  /** Opens confirm dialog and caches form data. */
  const onSubmitValidate = (data: FormValues) => {
    setConfirmDialogOpen(true);
    setFormDataCache(data);
  };

  /** Creates or updates sub-account with role, state, account, name, password, day_limit, permission. */
  const onSubmit = async () => {
    setConfirmDialogOpen(false);
    if (!roleId || !loginUser?.login_account) return;

    setIsLoading(true);
    const payload: User = {
      role_id: roleId,
      state: formDataCache?.state,
      account: formDataCache?.account,
      name: formDataCache?.name,
      login_password: validatedId ? formDataCache?.login_password : "",
      password:
        formDataCache?.password !== "" ? formDataCache?.password : undefined,
      day_limit: formDataCache?.day_limit,
      permission:
        selectedPermissions.length > 0 ? selectedPermissions.join("|") : "",
      creator_account: loginUser?.login_account,
      is_subaccount: true,
    };

    if (validatedId) {
      try {
        const response = await updateUser(validatedId, payload);
        setIsLoading(false);
        if (response.success) {
          setSuccessDialogOpen(true);
        }
      } catch (error) {
        if (error instanceof AxiosError && error.response?.data) {
          const data = error.response.data as Record<string, unknown>;
          const msg = String(data?.message ?? "");
          const displayMessage = isEn
            ? msg === "管理员密码与旧管理员密码不相符"
              ? "The administrator password does not match the old administrator password."
              : "Update failed, please check your old password or other information."
            : msg || "更新失败，请检查旧密码或其他信息";
          setErrorFromResponse(displayMessage);
        } else {
          setErrorFromResponse(error);
        }
        setIsLoading(false);
      }
    } else {
      try {
        const response = await createUser(payload);
        setIsLoading(false);
        if (response.success) {
          setSuccessDialogOpen(true);
        }
      } catch (error) {
        if (error instanceof AxiosError && error.response?.data) {
          const data = error.response.data as Record<string, unknown>;
          const displayMessage = String(
            data?.message ?? "创建失败，请检查信息",
          );
          setErrorFromResponse(displayMessage);
        } else {
          setErrorFromResponse(error);
        }
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmitValidate)} className="space-y-6">
        <Controller
          name="state"
          control={control}
          render={({ field }) => (
            <SelectField
              id="state"
              label={t("saf_state")}
              labelWidth={dynamicLabelWidth}
              selectWidth="w-80"
              options={[
                { value: "offline", label: t("saf_offline") },
                { value: "online", label: t("saf_online") },
              ]}
              register={register("state")}
              value={field.value}
              onChange={(val) => field.onChange(val)}
              selectClassName="w-70 lg:w-90"
            />
          )}
        />
        <div className="flex">
          <InputField
            id="account"
            label={t("saf_account")}
            labelWidth={dynamicLabelWidth}
            readOnly={!!validatedId}
            placeholder={t("saf_acc_holder")}
            registerProps={register("account")}
            error={translateError(t, "saf_account", errors.account)}
            inputClassName="placeholder:text-xs md:placeholder:text-sm w-70 lg:w-90"
          />
        </div>
        <div className="flex">
          <InputField
            id="name"
            label={t("saf_name")}
            labelWidth={dynamicLabelWidth}
            registerProps={register("name")}
            error={translateError(t, "saf_name", errors.name)}
            inputClassName="w-70 lg:w-90"
          />
        </div>
        {validatedId && (
          <>
            <div className="flex">
              <div>
                <InputField
                  id="login_password"
                  label={t("saf_login_password")}
                  labelWidth={dynamicLabelWidth}
                  type="password"
                  inputClassName="w-70 lg:w-90"
                  registerProps={register("login_password")}
                  error={translateError(
                    t,
                    "saf_login_password",
                    errors.login_password,
                  )}
                />
                <div className="text-sm flex justify-end items-center gap-1 whitespace-nowrap text-red-500">
                  <Icons.question size={15} />
                  {t("saf_notice")}
                </div>
              </div>
            </div>
          </>
        )}
        <div className="flex">
          <InputField
            id="password"
            label={t("saf_password")}
            labelWidth={dynamicLabelWidth}
            type="password"
            placeholder={t("saf_password_holder")}
            required={!validatedId}
            registerProps={register("password")}
            error={
              isSubmitted ||
              touchedFields.password ||
              dirtyFields.password
                ? translateError(t, "saf_password", errors.password)
                : undefined
            }
            inputClassName="placeholder:text-xs md:placeholder:text-sm w-70 lg:w-90"
          />
        </div>
        <div className="flex">
          <InputField
            id="confirm_password"
            label={t("saf_confirm_password")}
            labelWidth={dynamicLabelWidth}
            type="password"
            required={!validatedId}
            registerProps={register("confirm_password")}
            error={
              isSubmitted ||
              touchedFields.confirm_password ||
              dirtyFields.confirm_password
                ? translateError(
                    t,
                    "saf_confirm_password",
                    errors.confirm_password,
                  )
                : undefined
            }
            inputClassName="w-70 lg:w-90"
          />
        </div>
        <div className="flex">
          <InputField
            id="day_limit"
            label={t("saf_day")}
            labelWidth={dynamicLabelWidth}
            type="number"
            placeholder={t("saf_day_holder")}
            registerProps={register("day_limit", { valueAsNumber: true })}
            error={translateError(t, "saf_day", errors.day_limit)}
            inputClassName="w-70 lg:w-90"
          />
        </div>
        <div>
          <h2 className="font-semibold text-lg">{t("saf_control_item")}</h2>
          <Button
            variant="info"
            type="button"
            className="mt-1"
            onClick={handleSelectAll}
          >
            {t("saf_select_all")}
          </Button>
          <div className="mt-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {groupedPermissions.map((group) => (
              <div
                key={group.key}
                className="space-y-2 p-4"
                style={{ backgroundColor: "rgba(0,0,0,0.1)" }}
              >
                <h3 className="font-medium text-lg">{t(group.value)}</h3>
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <CheckboxField
                      id={item.key}
                      checked={selectedPermissions.includes(item.key)}
                      onCheckedChange={() => togglePermission(item.key)}
                      className="h-4 w-4 bg-white"
                    />
                    <Label
                      htmlFor={item.key}
                      className="text-sm cursor-pointer"
                    >
                      {t(item.value)}
                    </Label>
                  </div>
                ))}
              </div>
            ))}
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
          <Button
            variant="destructive"
            type="button"
            className="p-4"
            onClick={() => navigate("/admin/sub_account")}
          >
            <Icons.cross />
            {t("common_destructive")}
          </Button>
        </div>
      </form>
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
          reset();
          navigate("/admin/sub_account");
        }}
        status="success"
        message={validatedId ? t("saf_success_modify") : t("saf_success_add")}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={onSubmit}
        status="confirm"
      />
    </>
  );
};

export default Form;
