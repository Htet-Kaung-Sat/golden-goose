import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { getBalance } from "@/api/admin/user";
import { useAuthGuard } from "./authGuardContext";
import { LoadingContext } from "./useLoading";

export const LoadingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState("0");
  const [totalBalance, setTotalBalance] = useState("0");
  const [permission, setPermission] = useState("");
  const updateBalances = (bal: string, total: string, permit: string) => {
    setBalance(bal);
    setTotalBalance(total);
    setPermission(permit);
  };
  const location = useLocation();
  const isAdmin = location.pathname.includes("admin");
  const { setErrorFromResponse } = useAuthGuard();

  // [PERFORMANCE FIX] Fetch balance from dedicated endpoint when on admin (not on every API request)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchBalance = async () => {
      try {
        const data = await getBalance();
        setBalance(data.balance);
        setTotalBalance(data.totalBalance);
        setPermission(data.permission);
      } catch (error) {
        setErrorFromResponse(error);
        setIsLoading(false);
      }
    };
    fetchBalance();
  }, [isAdmin, location.pathname, setErrorFromResponse]);

  const { t } = useTranslation();
  const commonAction = [
    { id: "user_topup", name: t("topup") },
    { id: "user_modify_status", name: t("modify_status") },
    { id: "user_change_password", name: t("change_password") },
    { id: "bet_limit_config", name: t("bet_limit_config") },
    { id: "auto_settle_wash_code", name: t("auto_settle_wash_code") },
    { id: "auto_settle_rebate", name: t("auto_settle_rebate") },
    { id: "user_change_name", name: t("change_name") },
    { id: "update_info", name: t("update_info") },
  ];

  return (
    <LoadingContext.Provider
      value={{
        actions: commonAction,
        isLoading,
        setIsLoading,
        balance,
        totalBalance,
        permission,
        updateBalances,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};
