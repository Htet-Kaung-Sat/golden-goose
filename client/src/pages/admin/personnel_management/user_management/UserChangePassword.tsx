import { getUser, updateUser } from "@/api/admin/user";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { User } from "@/types/User";
import { getPublicIp } from "@/utils/PublicIp";
import { UserChangePasswordSchema } from "@/validation/admin/UserChangePasswordSchema";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { usePasswordConfirmRevalidate } from "@/hooks/usePasswordConfirmRevalidate";
import { useCallback, useEffect, useRef, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { InferType } from "yup";
import { AxiosError } from "axios";

type FormValues = InferType<typeof UserChangePasswordSchema> & {
  screen_name: string;
  ip_location: string;
};

/**
 * User change password tab: set new password for selected user.
 */
const UserChangePassword = () => {
  const [user, setUser] = useState<User | null>(null);
  const [formDataCache, setFormDataCache] = useState<FormValues | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [path, setPath] = useState("");
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
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
  const dynamicLabelWidth = isEn ? "md:w-40" : "md:w-20";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, touchedFields, dirtyFields, isSubmitted },
    reset,
  } = useForm<FormValues>({
    resolver: yupResolver(
      UserChangePasswordSchema,
    ) as unknown as Resolver<FormValues>,
    mode: "onChange",
    defaultValues: {
      account: "",
      password: "",
      confirm_password: "",
    },
  });

  const password = watch("password");
  usePasswordConfirmRevalidate(
    password,
    "confirm_password",
    trigger as (name?: string) => Promise<boolean>,
  );

  /** Fetches user by route account for display. */
  const fetchUser = useCallback(async () => {
    if (!validatedId) return;
    try {
      setIsLoading(true);
      const data = await getUser(validatedId);
      setUser(data);
      setValue("account", String(data.account));
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
      fetchUser();
      didFetch.current = true;
    }
  }, [validatedId, pathname, fetchUser]);

  /** Validates and opens confirm before submit. */
  const onSubmitValidate = (data: FormValues) => {
    setConfirmDialogOpen(true);
    setFormDataCache(data);
  };

  /** Submits new password for user. */
  const onSubmit = async () => {
    setConfirmDialogOpen(false);
    setIsLoading(true);
    try {
      const ip_location = await getPublicIp();
      const payload: FormValues = {
        account: formDataCache?.account ?? "",
        password: formDataCache?.password?.trim() ?? "",
        confirm_password: formDataCache?.confirm_password ?? "",
        ip_location,
        screen_name: "修改密码",
      };
      const response = await updateUser(Number(user?.id), payload);
      setIsLoading(false);
      if (response.success) {
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const msg = String(data?.message ?? "");
        const displayMessage = msg || t("ucp_error_message");
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
        <form onSubmit={handleSubmit(onSubmitValidate)}>
          <div className="flex flex-col gap-4">
            <div>
              <InputField
                id="account"
                label={t("ucp_account")}
                labelWidth={dynamicLabelWidth}
                type="text"
                required={false}
                readOnly
                registerProps={register("account")}
                error={translateError(t, "ucp_account", errors.account)}
                inputClassName="w-70"
              />
            </div>
            <div>
              <InputField
                id="password"
                label={t("ucp_password")}
                labelWidth={dynamicLabelWidth}
                type="password"
                required={true}
                placeholder={t("ucp_password_holder")}
                registerProps={register("password")}
                error={
                  isSubmitted ||
                  touchedFields.password ||
                  dirtyFields.password
                    ? translateError(t, "ucp_password", errors.password)
                    : undefined
                }
                inputClassName="w-70"
              />
            </div>
            <div>
              <InputField
                id="confirm_password"
                label={t("ucp_confirm_password")}
                labelWidth={dynamicLabelWidth}
                type="password"
                registerProps={register("confirm_password")}
                required={false}
                error={
                  isSubmitted ||
                  touchedFields.confirm_password ||
                  dirtyFields.confirm_password
                    ? translateError(
                        t,
                        "ucp_confirm_password",
                        errors.confirm_password,
                      )
                    : undefined
                }
                inputClassName="w-70"
              />
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
          reset();
          fetchUser();
        }}
        status="success"
        message={t("ucp_success_modify")}
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

export default UserChangePassword;
