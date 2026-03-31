import { getUser, userLockUnlock } from "@/api/admin/user";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { getPublicIp } from "@/utils/PublicIp";
import { ModifyStatusSchema } from "@/validation/admin/ModifyStatusSchema";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useRef, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { InferType } from "yup";
import { AxiosError } from "axios";

type FormValues = InferType<typeof ModifyStatusSchema> & {
  screen_name: string;
  ip_location: string;
  event: string;
};

/**
 * Modify status tab: change user state (normal/suspension) with confirm.
 */
const ModifyStatus = () => {
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
  const dynamicLabelWidth = isEn ? "md:w-28" : "md:w-20";
  const states = [
    { value: "normal", label: t("common_normal") },
    { value: "suspension", label: t("common_suspension") },
    { value: "freeze", label: t("common_freeze") },
  ];
  const lockings = [
    { value: "normal", label: t("common_normal") },
    { value: "locking", label: t("common_locking") },
  ];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: yupResolver(
      ModifyStatusSchema,
    ) as unknown as Resolver<FormValues>,
    defaultValues: {
      account: "",
      state: "",
      locking: "",
    },
  });

  /** Fetches user by route account. */
  const fetchUser = useCallback(async () => {
    if (!validatedId) return;
    try {
      setIsLoading(true);
      const data = await getUser(validatedId);
      setValue("account", String(data.account));
      setValue("state", data.state ?? "normal");
      setValue("locking", data.locking ?? "normal");
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

  /** Submits state change (normal/suspension). */
  const onSubmit = async () => {
    setConfirmDialogOpen(false);
    setIsLoading(true);
    try {
      const ip_location = await getPublicIp();
      const payload: FormValues = {
        account: formDataCache?.account ? formDataCache?.account : "",
        state: formDataCache?.state ? formDataCache?.state : "normal",
        locking: formDataCache?.locking ? formDataCache?.locking : "normal",
        ip_location: ip_location,
        screen_name: "修改状态",
        event: "state",
      };
      const response = await userLockUnlock(payload);
      setIsLoading(false);
      if (response.success) {
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const displayMessage = String(data?.message ?? t("ms_error_message"));
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
          <div className="flex flex-col gap-4 my-3">
            <div>
              <InputField
                id="account"
                label={t("ms_account")}
                labelWidth={dynamicLabelWidth}
                type="text"
                required={false}
                readOnly={true}
                inputClassName="w-70"
                registerProps={register("account")}
                error={translateError(t, "ms_account", errors.account)}
              />
            </div>
            <div>
              <SelectField
                id="state"
                label={t("ms_state")}
                labelWidth={dynamicLabelWidth}
                value={
                  states.find((d) => d.value === String(watch("state")))?.value
                }
                options={states.map((d) => ({
                  value: String(d.value),
                  label: d.label ?? "",
                }))}
                selectClassName="w-70"
                register={register("state")}
                error={translateError(t, "ms_state", errors.state)}
              />
            </div>
            <div>
              <SelectField
                id="locking"
                label={t("ms_lock")}
                labelWidth={dynamicLabelWidth}
                value={
                  lockings.find((d) => d.value === String(watch("locking")))
                    ?.value
                }
                options={lockings.map((d) => ({
                  value: String(d.value),
                  label: d.label ?? "",
                }))}
                selectClassName="w-70"
                register={register("locking")}
                error={translateError(t, "ms_lock", errors.locking)}
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
        message={t("ms_success_modify")}
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

export default ModifyStatus;
