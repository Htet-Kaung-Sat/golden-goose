import { getUser, updateUser } from "@/api/admin/user";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { getPublicIp } from "@/utils/PublicIp";
import { NickNameSchema } from "@/validation/admin/NickNameSchema";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useRef, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { InferType } from "yup";
import { AxiosError } from "axios";
type FormValues = InferType<typeof NickNameSchema> & {
  account: string;
  screen_name: string;
  ip_location: string;
};

/**
 * Nickname tab: update user screen_name (display name).
 */
const NickName = () => {
  const [accountNo, setAccountNo] = useState("");
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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: yupResolver(NickNameSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      name: "",
    },
  });

  /** Fetches user by route account and resets form. */
  const fetchUser = useCallback(async () => {
    if (!validatedId) return;
    try {
      setIsLoading(true);
      const data = await getUser(validatedId);
      setValue("name", String(data.name));
      setAccountNo(String(data?.account));
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

  /** Submits screen_name update. */
  const onSubmit = async () => {
    if (!validatedId) return;
    setIsLoading(true);
    setConfirmDialogOpen(false);
    try {
      const ip_location = await getPublicIp();
      const payload = {
        account: accountNo,
        name: formDataCache?.name.trim(),
        ip_location: ip_location,
        screen_name: "修改昵称",
      };
      const response = await updateUser(validatedId, payload);
      setIsLoading(false);
      if (response.success) {
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const displayMessage = String(data?.message ?? t("nn_error_modify"));
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
          <div className="w-full mb-4">
            <InputField
              id="name"
              label={t("nn_name")}
              labelWidth={dynamicLabelWidth}
              type="text"
              required={true}
              registerProps={register("name")}
              error={translateError(t, "nn_name", errors.name)}
            />
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
          reset();
          fetchUser();
        }}
        status="success"
        message={t("nn_success_modify")}
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

export default NickName;
