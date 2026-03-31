import { getUser, updateInfo } from "@/api/admin/user";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useLoading } from "@/contexts/useLoading";
import { User } from "@/types/User";
import { UpdateUserSchema } from "@/validation/admin/UpdateUserSchema";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { AxiosError } from "axios";
import { usePasswordConfirmRevalidate } from "@/hooks/usePasswordConfirmRevalidate";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { InferType } from "yup";
import { useAuthGuard } from "@/contexts/authGuardContext";

/**
 * Info update tab: update user profile fields.
 */
const InfoUpdate = () => {
  type FormValues = InferType<typeof UpdateUserSchema>;
  const { pathname } = useLocation();
  const fallbackPath = pathname.includes("agent")
    ? "/admin/user_management/agent"
    : pathname.includes("member")
      ? "/admin/user_management/member"
      : "/admin/user_search";
  const validatedId = useValidatedIdParam(fallbackPath);
  const [user, setUser] = useState<User | null>(null);
  const { t, i18n } = useTranslation();
  const isEng = i18n.language === "en";
  const navigate = useNavigate();
  const [path, setPath] = useState("");
  const dynamicLabelWidth = isEng ? "md:w-50" : "md:w-28";
  const [refreshKey, setRefreshKey] = useState(0);
  const [formDataCache, setFormDataCache] = useState<FormValues | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const { isLoading, setIsLoading } = useLoading();
  const didFetch = useRef(false);

  const {
    register,
    control,
    reset,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, touchedFields, dirtyFields, isSubmitted },
  } = useForm<FormValues>({
    resolver: yupResolver(UpdateUserSchema),
    mode: "onChange",
    defaultValues: {
      account: "",
      name: "",
      password: "",
      new_password: "",
      confirm_password: "",
      state: "",
      locking: "",
    },
  });

  const newPassword = watch("new_password");
  const password = watch("password");
  usePasswordConfirmRevalidate(
    newPassword,
    "confirm_password",
    trigger as (name?: string) => Promise<boolean>,
  );
  usePasswordConfirmRevalidate(
    password,
    "new_password",
    trigger as (name?: string) => Promise<boolean>,
  );

  /** Fetches user by route account and resets form. */
  const fetchUser = useCallback(async () => {
    if (!validatedId) return;
    setIsLoading(true);
    try {
      const data = await getUser(validatedId);
      setUser(data);
      reset({
        account: data.account || "",
        name: data.name || "",
        password: "",
        new_password: "",
        confirm_password: "",
        state: data.state || "",
        locking: data.locking || "",
      });
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [validatedId, reset, setErrorFromResponse, setIsLoading]);

  useEffect(() => {
    if (!didFetch.current) {
      if (!validatedId) return;
      fetchUser();
      if (pathname.includes("agent")) {
        setPath("agent");
      } else if (pathname.includes("member")) {
        setPath("member");
      }
      didFetch.current = true;
    }
  }, [refreshKey, validatedId, fetchUser, pathname]);

  /** Validates and opens confirm before submit. */
  const onSubmitValidate = (data: FormValues) => {
    setFormDataCache(data);
    setConfirmDialogOpen(true);
  };

  /** Submits profile update. */
  const onSubmit = async () => {
    setConfirmDialogOpen(false);
    if (!user?.id) {
      return;
    }
    setIsLoading(true);
    try {
      const filters = {
        name: formDataCache?.name,
        account: formDataCache?.account,
        oldPassword: formDataCache?.password?.trim(),
        password: formDataCache?.new_password?.trim(),
        state: formDataCache?.state,
        locking: formDataCache?.locking,
        screen_name: "信息更新",
      };
      const response = await updateInfo(user.id, filters);
      setIsLoading(false);
      if (response.success) {
        setRefreshKey((v) => v + 1);
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const msg = String(data?.message ?? "");
        const displayMessage = isEng
          ? msg === "密码与旧密码不相符"
            ? "Password does not match the old password."
            : "Password change failed."
          : msg || "修改密码失败";
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmitValidate)} className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <InputField
              id="account"
              label={t("iu_account")}
              type="text"
              defaultValue={user?.account || ""}
              labelWidth={dynamicLabelWidth}
              readOnly
              required={true}
              horizontal={true}
              registerProps={register("account")}
              error={translateError(t, "iu_account", errors.account)}
              inputClassName="w-80"
            />
          </div>
          <div>
            <InputField
              id="name"
              label={t("iu_name")}
              type="text"
              labelWidth={dynamicLabelWidth}
              defaultValue={user?.name || ""}
              required={true}
              horizontal={true}
              placeholder={t("iu_name")}
              registerProps={register("name")}
              error={translateError(t, "iu_name", errors.name)}
              inputClassName="w-80"
            />
          </div>
          <div className="flex">
            <div>
              <InputField
                id="password"
                label={t("iu_password")}
                type="password"
                required={true}
                labelWidth={dynamicLabelWidth}
                horizontal={true}
                placeholder={t("iu_password")}
                autocomplete="current-password"
                registerProps={register("password")}
                error={
                  isSubmitted || touchedFields.password || dirtyFields.password
                    ? translateError(t, "iu_password", errors.password)
                    : undefined
                }
                inputClassName="w-80"
              />
            </div>
          </div>
          <div>
            <InputField
              id="new_password"
              label={t("iu_new_password")}
              type="password"
              required={true}
              horizontal={true}
              labelWidth={dynamicLabelWidth}
              placeholder={t("iu_new_password")}
              autocomplete="new_password"
              registerProps={register("new_password")}
              error={
                isSubmitted ||
                touchedFields.new_password ||
                dirtyFields.new_password
                  ? translateError(t, "iu_new_password", errors.new_password)
                  : undefined
              }
              inputClassName="w-80"
            />
          </div>
          <div>
            <InputField
              id="confirm_password"
              label={t("iu_confirm_password")}
              type="password"
              required={true}
              labelWidth={dynamicLabelWidth}
              horizontal={true}
              placeholder={t("iu_confirm_password")}
              autocomplete="confirm_password"
              registerProps={register("confirm_password")}
              error={
                isSubmitted ||
                touchedFields.confirm_password ||
                dirtyFields.confirm_password
                  ? translateError(
                      t,
                      "iu_confirm_password",
                      errors.confirm_password,
                    )
                  : undefined
              }
              inputClassName="w-80"
            />
          </div>
          <div>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <SelectField
                  id="state"
                  label={t("iu_state")}
                  labelWidth={dynamicLabelWidth}
                  options={[
                    { value: "normal", label: t("common_normal") },
                    { value: "suspension", label: t("common_suspension") },
                    { value: "freeze", label: t("common_freeze") },
                  ]}
                  register={register("state")}
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  placeholder={t("common_please_select")}
                  error={translateError(t, "iu_state", errors.state)}
                  selectClassName="w-80"
                />
              )}
            />
          </div>
          <div>
            <Controller
              name="locking"
              control={control}
              render={({ field }) => (
                <SelectField
                  id="locking"
                  label={t("iu_locking")}
                  labelWidth={dynamicLabelWidth}
                  options={[
                    { value: "normal", label: t("common_normal") },
                    { value: "locking", label: t("common_locking") },
                  ]}
                  register={register("locking")}
                  value={field.value}
                  onChange={(val) => field.onChange(val)}
                  error={translateError(t, "iu_locking", errors.locking)}
                  placeholder={t("common_please_select")}
                  selectClassName="w-80"
                />
              )}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
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
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
      <ConfirmDialog
        open={successDialogOpen}
        onClose={() => {
          setSuccessDialogOpen(false);
          reset();
        }}
        status="success"
        message={t("iu_success_password")}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
        }}
        onConfirm={onSubmit}
        status="confirm"
      />
    </div>
  );
};

export default InfoUpdate;
