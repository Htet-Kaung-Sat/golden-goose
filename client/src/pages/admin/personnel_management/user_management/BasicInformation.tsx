import { getUsers, userLockUnlock } from "@/api/admin/user";
import AgentTree from "@/components/shared/AgentTree";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import InputField from "@/components/shared/InputField";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { ModifyUser } from "@/types";
import { User } from "@/types/User";
import { getPublicIp } from "@/utils/PublicIp";
import { AxiosError } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Basic information tab: view user by account (AgentTree), lock/unlock with confirm.
 */
const BasicInformation = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [locking, setLocking] = useState("");
  const [accountNo, setAccountNo] = useState(loginUser?.account);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [bonusRate, setBonusRate] = useState("");
  const [shareRate, setShareRate] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { isLoading, setIsLoading } = useLoading();
  const didFetch = useRef(false);
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-36" : "md:w-20";

  /** Fetches user by account and sets name, balance, bonus/share rate. */
  const fetchInit = useCallback(
    async (account: string) => {
      try {
        const res = await getUsers({ account: account });
        setName(String(res.data.users?.[0]?.name));
        setBalance(String(res.data.users?.[0]?.balance));
        setBonusRate(
          res.data.users?.[0]?.bonus_rate
            ? parseFloat(String(res.data.users[0].bonus_rate)) + "%"
            : "",
        );
        setShareRate(
          res.data.users?.[0]?.share_rate
            ? res.data.users?.[0]?.share_rate + "%"
            : "",
        );
        setIsLoading(false);
      } catch (error) {
        setErrorFromResponse(error);
        setIsLoading(false);
      }
    },
    [setErrorFromResponse, setIsLoading],
  );

  useEffect(() => {
    if (!didFetch.current) {
      fetchInit(String(loginUser?.account ?? ""));
      didFetch.current = true;
    }
  }, [loginUser?.account, fetchInit]);

  /** Opens confirm dialog for lock action. */
  const handleConfirmLock = () => {
    setDialogMessage(t("bi_lock_message"));
    setTitle(t("bi_locking"));
    setLocking("locking");
    setConfirmDialogOpen(true);
  };

  /** Opens confirm dialog for unlock action. */
  const handleConfirmUnlock = () => {
    setDialogMessage(t("bi_unlock_message"));
    setTitle(t("bi_unlocking"));
    setLocking("normal");
    setConfirmDialogOpen(true);
  };

  /** Calls userLockUnlock API with locking state. */
  const onSubmit = async () => {
    setConfirmDialogOpen(false);
    try {
      setIsLoading(true);
      const ip_location = await getPublicIp();
      const payload: ModifyUser = {
        account: String(accountNo),
        screen_name: "基本信息",
        ip_location: ip_location,
        locking: locking,
        event: "locking",
      };
      const response = await userLockUnlock(payload);
      setIsLoading(false);
      if (response.success) {
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const displayMessage = String(data?.message ?? t("bi_error_lock"));
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
      setIsLoading(false);
    }
  };

  /** Sets account and refetches user info. */
  const handleAgentSearch = async (account: string) => {
    setAccountNo(account);
    fetchInit(account);
  };

  return (
    <div className="mt-3">
      <div className="flex justify-start gap-2">
        <Button
          variant="danger"
          className="sm:px-4 sm:py-2"
          disabled={isLoading}
          onClick={handleConfirmLock}
        >
          {t("bi_lock")}
        </Button>
        <Button
          variant="info"
          className="sm:px-4 sm:py-2"
          disabled={isLoading}
          onClick={handleConfirmUnlock}
        >
          {t("bi_unlock")}
        </Button>
      </div>
      <div className="mt-4 mx-3">
        <fieldset>
          <form className="space-y-4 w-full">
            <InputField
              id="account_no"
              label={t("bi_account")}
              labelWidth={dynamicLabelWidth}
              type="text"
              required={true}
              value={accountNo}
              inputClassName="md:w-70"
              readOnly
            />
            <InputField
              id="name"
              label={t("bi_name")}
              labelWidth={dynamicLabelWidth}
              type="text"
              required={true}
              defaultValue={name}
              inputClassName="md:w-70"
              readOnly
            />
            <InputField
              id="remaining_amount"
              label={t("bi_balance")}
              labelWidth={dynamicLabelWidth}
              type="text"
              required={false}
              defaultValue={balance}
              inputClassName="md:w-70"
              readOnly
            />
            <InputField
              id="nickname"
              label={t("bi_bonus")}
              labelWidth={dynamicLabelWidth}
              type="text"
              required={false}
              defaultValue={bonusRate}
              inputClassName="md:w-70"
              readOnly
            />
            <InputField
              id="accountFor"
              label={t("bi_share")}
              labelWidth={dynamicLabelWidth}
              type="text"
              required={false}
              defaultValue={shareRate}
              inputClassName="md:w-70"
              readOnly
            />
          </form>
        </fieldset>
      </div>
      <div className="mt-10">
        <AgentTree onSearch={handleAgentSearch} />
      </div>
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
        message={t("bi_success_lock")}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
        }}
        onConfirm={onSubmit}
        status="confirm"
        title={title}
        message={dialogMessage}
      />
    </div>
  );
};

export default BasicInformation;
