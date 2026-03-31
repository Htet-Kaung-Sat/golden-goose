import { AxiosError } from "axios";
import { getUser, updateUser } from "@/api/admin/user";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { User } from "@/types/User";
import { ChangePasswordSchema } from "@/validation";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { usePasswordConfirmRevalidate } from "@/hooks/usePasswordConfirmRevalidate";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { InferType } from "yup";

type FormValues = InferType<typeof ChangePasswordSchema>;

/**
 * Change password page: form to update current user's name and password (with confirmation).
 */
const ChangePassword = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [user, setUser] = useState<User | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [formDataCache, setFormDataCache] = useState<FormValues | null>(null);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorMessage,
    setErrorFromResponse,
  } = useAuthGuard();
  const { isLoading, setIsLoading } = useLoading();
  const navigate = useNavigate();
  const didFetch = useRef(false);
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-60" : "md:w-28";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    trigger,
    formState: { errors, touchedFields, dirtyFields, isSubmitted },
  } = useForm<FormValues>({
    resolver: yupResolver(ChangePasswordSchema),
    mode: "onChange",
    defaultValues: {
      account: "",
      name: "",
      password: "",
      new_password: "",
      confirm_password: "",
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

  /** Fetches current user by login_id and resets form with account/name. */
  const fetchUser = useCallback(async () => {
    setErrorMessage(null);
    if (!loginUser?.login_id) return;
    try {
      const data = await getUser(Number(loginUser.login_id));
      setUser(data);
      reset({
        account: data.account || "",
        name: data.name || "",
        password: "",
        new_password: "",
        confirm_password: "",
      });
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [
    loginUser?.login_id,
    reset,
    setErrorFromResponse,
    setErrorMessage,
    setIsLoading,
  ]);

  useEffect(() => {
    if (!didFetch.current) {
      fetchUser();
      didFetch.current = true;
    }
  }, [fetchUser]);

  /** Validates form and opens confirm dialog before submit. */
  const onSubmitValidate = (data: FormValues) => {
    setFormDataCache(data);
    setConfirmDialogOpen(true);
  };

  /** Submits name and new password via updateUser API. */
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
      };
      const response = await updateUser(user.id, filters);
      setIsLoading(false);
      if (response.success) {
        fetchUser();
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const msg = String(data?.message ?? "");
        const displayMessage = isEn
          ? msg === "管理员密码与旧管理员密码不相符"
            ? "The administrator password does not match the old administrator password."
            : "Password change failed."
          : msg || t("cp_error_password");
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
      setIsLoading(false);
    }
  };

  return (
    <>
      <fieldset disabled={isLoading}>
        <form onSubmit={handleSubmit(onSubmitValidate)} className="space-y-6">
          <div className="">
            <div className="flex flex-col gap-4">
              <div>
                <InputField
                  id="account"
                  label={t("cp_account")}
                  labelWidth={dynamicLabelWidth}
                  type="text"
                  defaultValue={user?.account || ""}
                  readOnly
                  required={true}
                  horizontal={true}
                  registerProps={register("account")}
                  error={translateError(t, "cp_account", errors.account)}
                  inputClassName="w-60 lg:w-80"
                />
              </div>
              <div>
                <InputField
                  id="name"
                  label={t("cp_name")}
                  labelWidth={dynamicLabelWidth}
                  type="text"
                  defaultValue={user?.name || ""}
                  required={true}
                  horizontal={true}
                  placeholder={t("cp_name")}
                  registerProps={register("name")}
                  error={translateError(t, "cp_name", errors.name)}
                  inputClassName="w-60 lg:w-80"
                />
              </div>
              <div className="flex">
                <div>
                  <InputField
                    id="password"
                    label={t("cp_password")}
                    labelWidth={dynamicLabelWidth}
                    type="password"
                    required={true}
                    horizontal={true}
                    placeholder={t("cp_password")}
                    registerProps={register("password")}
                    autocomplete="current-password"
                    error={
                      isSubmitted ||
                      touchedFields.password ||
                      dirtyFields.password
                        ? translateError(t, "cp_password", errors.password)
                        : undefined
                    }
                    inputClassName="w-60 lg:w-80"
                  />
                  <div className="text-sm flex justify-end items-center gap-1 whitespace-nowrap text-red-500">
                    <Icons.question size={15} />
                    {t("cp_notice")}
                  </div>
                </div>
              </div>
              <div>
                <InputField
                  id="new_password"
                  label={t("cp_new_password")}
                  labelWidth={dynamicLabelWidth}
                  type="password"
                  required={true}
                  horizontal={true}
                  placeholder={t("cp_new_password")}
                  registerProps={register("new_password")}
                  autocomplete="new_password"
                  error={
                    isSubmitted ||
                    touchedFields.new_password ||
                    dirtyFields.new_password
                      ? translateError(
                          t,
                          "cp_new_password",
                          errors.new_password,
                        )
                      : undefined
                  }
                  inputClassName="w-60 lg:w-80"
                />
              </div>
              <div>
                <InputField
                  id="confirm_password"
                  label={t("cp_confirm_password")}
                  labelWidth={dynamicLabelWidth}
                  type="password"
                  required={true}
                  horizontal={true}
                  placeholder={t("cp_confirm_password")}
                  registerProps={register("confirm_password")}
                  autocomplete="confirm_password"
                  error={
                    isSubmitted ||
                    touchedFields.confirm_password ||
                    dirtyFields.confirm_password
                      ? translateError(
                          t,
                          "cp_confirm_password",
                          errors.confirm_password,
                        )
                      : undefined
                  }
                  inputClassName="w-60 lg:w-80"
                />
              </div>
            </div>
            <div />
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
              onClick={() => navigate("/admin")}
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
        message={t("cp_success_password")}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
        }}
        onConfirm={onSubmit}
        status="confirm"
      />
    </>
  );
};

export default ChangePassword;
