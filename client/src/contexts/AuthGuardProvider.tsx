import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { AxiosError } from "axios";
import AuthGuard from "@/components/shared/AuthGuard";
import {
  AuthGuardContext,
  type AuthGuardContextValue,
} from "./authGuardContext";
import { ADMIN_OPERATOR_FORBIDDEN_EVENT } from "@/api/axios";

const REMEMBERED_ACCOUNT_KEY = "rememberedAccount";

export function AuthGuardProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [prohibited, setProhibited] = useState(false);
  const [illegal, setIllegal] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setForbidden(true);
      setErrorMessage(detail?.message ?? t("dialog_forbidden"));
      setErrorDialogOpen(true);
    };
    window.addEventListener(ADMIN_OPERATOR_FORBIDDEN_EVENT, handler);
    return () => window.removeEventListener(ADMIN_OPERATOR_FORBIDDEN_EVENT, handler);
  }, [t]);

  const setErrorFromResponse = useCallback(
    (error: unknown) => {
      if (error === "prohibited") {
        setProhibited(true);
        setErrorMessage(t("dialog_prohibited"));
      } else if (error === "illegal") {
        setIllegal(true);
        setErrorMessage(t("dialog_illegal"));
      } else if (error === "forbidden") {
        setForbidden(true);
        setErrorMessage(t("dialog_forbidden"));
      } else if (error instanceof AxiosError) {
        setErrorMessage(error.response?.data?.message ?? String(error));
      } else {
        setErrorMessage(String(error));
      }
      setErrorDialogOpen(true);
    },
    [t],
  );

  const handleCloseErrorDialog = useCallback(() => {
    setErrorDialogOpen(false);
    if (prohibited || forbidden) {
      setProhibited(false);
      setForbidden(false);
      Object.keys(localStorage).forEach((key) => {
        if (key !== REMEMBERED_ACCOUNT_KEY) {
          localStorage.removeItem(key);
        }
      });
      const path = location.pathname;
      if (path.includes("/operator")) {
        navigate("/operator/login");
      } else {
        i18n.changeLanguage("zh");
        navigate("/admin/login");
      }
    } else {
      setIllegal(false);
      navigate("/admin");
    }
  }, [prohibited, forbidden, location.pathname, i18n, navigate]);

  const canShowContent = !illegal && !prohibited && !forbidden;

  const value: AuthGuardContextValue = {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorMessage,
    setErrorFromResponse,
    handleCloseErrorDialog,
    canShowContent,
  };

  return (
    <AuthGuardContext.Provider value={value}>
      <AuthGuard
        canShowContent={canShowContent}
        errorDialogOpen={errorDialogOpen}
        errorMessage={errorMessage}
        onCloseError={handleCloseErrorDialog}
      >
        {children}
      </AuthGuard>
    </AuthGuardContext.Provider>
  );
}
