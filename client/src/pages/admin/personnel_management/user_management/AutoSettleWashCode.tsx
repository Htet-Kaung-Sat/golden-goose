/**
 * Auto-settle wash code tab: wash code settlement for user.
 */
import { getUser } from "@/api/admin/user";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Auto-settle rebate tab: trigger or view rebate settlement for user.
 */
const AutoSettleWashCode = () => {
  const { pathname } = useLocation();
  const fallbackPath = pathname.includes("agent")
    ? "/admin/user_management/agent"
    : pathname.includes("member")
      ? "/admin/user_management/member"
      : "/admin/user_search";
  const validatedId = useValidatedIdParam(fallbackPath);
  const [path, setPath] = useState("");
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const didFetch = useRef(false);

  /** Fetches user by route account. */
  const fetchUser = useCallback(async () => {
    if (!validatedId) return;
    try {
      setIsLoading(true);
      await getUser(validatedId);
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [validatedId, setErrorFromResponse, setIsLoading]);

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
  }, [validatedId, fetchUser, pathname]);

  return (
    <>
      <div>Auto Settle Wash Code Page</div>
      <div className="flex justify-end gap-2 mt-4">
        <Button
          variant="destructive"
          type="button"
          onClick={() => {
            if (location.pathname.includes("user_search")) {
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
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};
export default AutoSettleWashCode;
