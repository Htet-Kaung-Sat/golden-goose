import {
  getBalance,
  getUser,
  getUsers,
  updateUserBalance,
} from "@/api/admin/user";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import ErrorTooltip from "@/components/shared/ErrorTooltip";
import InputField from "@/components/shared/InputField";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { getSocket } from "@/lib/socket";
import { User } from "@/types/User";
import { getPublicIp } from "@/utils/PublicIp";
import { TopUpSchema, TOP_UP_AMOUNT_MAX } from "@/validation";
import { translateError } from "@/validation/messages/translateError";
import { yupResolver } from "@hookform/resolvers/yup";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, Resolver, useForm } from "react-hook-form";
import { useValidatedIdParam } from "@/utils/routeParams";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { InferType } from "yup";
import { AxiosError } from "axios";

/**
 * Top-up tab: add balance to user (amount and memo).
 */
const TopUp = () => {
  const { pathname } = useLocation();
  const fallbackPath = pathname.includes("agent")
    ? "/admin/user_management/agent"
    : pathname.includes("member")
      ? "/admin/user_management/member"
      : "/admin/user_search";
  const validatedId = useValidatedIdParam(fallbackPath);
  const [upperLowerUsers, setUpperLowerUsers] = useState<User[]>([]);
  const [upperUser, setUpperUser] = useState<User>();
  const [lowerUser, setLowerUser] = useState<User>();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [path, setPath] = useState("");
  const [formDataCache, setFormDataCache] = useState<FormValues | null>(null);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { isLoading, setIsLoading, updateBalances } = useLoading();
  const navigate = useNavigate();
  const didFetch = useRef(false);
  const { t } = useTranslation();
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const socket = getSocket();
  type FormValues = InferType<typeof TopUpSchema> & {
    actual_amount: number | undefined;
    operator_user_id: number | undefined;
    operated_user_id: number | undefined;
    action: string;
    ip_location: string;
  };

  const fetchUpperLowerUsers = useCallback(async () => {
    if (!validatedId) return;
    try {
      setIsLoading(true);
      const data = await getUser(validatedId);
      const payload = {
        accounts: `${String(data.creator_account)}, ${String(data.account)}`,
        order: "level",
      };
      const result = await getUsers(payload);
      setUpperLowerUsers(result.data.users ?? []);
      const upperUserData = result.data.users.find(
        (u) => u.account === String(data.creator_account),
      );
      setUpperUser(upperUserData);
      const lowerUserData = result.data.users.find(
        (u) => u.account === String(data.account),
      );
      setLowerUser(lowerUserData);
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
      fetchUpperLowerUsers();
      didFetch.current = true;
    }
  }, [validatedId, pathname, fetchUpperLowerUsers]);

  const {
    register,
    watch,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: yupResolver(TopUpSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      amount: 0,
      status: "",
      remark: "",
    },
  });
  const amount = watch("amount");
  const displayCalculateAmount = (() => {
    const numAmount = Number(amount) || 0;
    const shareRate = Number(lowerUser?.share_rate) || 0;

    if (shareRate !== 0 && shareRate !== 100) {
      const result = numAmount / ((100 - shareRate) / 100);
      return Number(result.toFixed(3));
    }
    return Number(numAmount.toFixed(3));
  })();

  const onSubmitValidate = (data: FormValues) => {
    setConfirmDialogOpen(true);
    setFormDataCache(data);
  };

  const onSubmit = async () => {
    setIsLoading(true);
    setConfirmDialogOpen(false);
    const ip_location = await getPublicIp();
    try {
      const payload: FormValues = {
        actual_amount: Number(formDataCache?.amount),
        amount: displayCalculateAmount,
        status: formDataCache?.status?.trim() || "",
        remark: formDataCache?.remark?.trim() || "",
        operator_user_id: upperUser?.id,
        operated_user_id: lowerUser?.id,
        action: formDataCache?.status === "1" ? "points_boost" : "deposit",
        ip_location: ip_location,
      };
      const response = await updateUserBalance(payload);
      if (response.success) {
        reset();
        fetchUpperLowerUsers();
        const data = await getBalance();
        updateBalances(data.balance, data.totalBalance, data.permission);
        if (socket) {
          socket.emit("member_topup:change");
        }
        setIsLoading(false);
        setSuccessDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const msg = String(data?.message ?? t("t_error_message"));
        const displayMessage = msg.includes("金额不得大")
          ? msg.replace("金额不得大", t("t_exceed_error"))
          : msg || t("t_error_message");
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "account",
      header: t("t_account"),
    },
    {
      accessorKey: "balance",
      header: t("t_balance"),
    },
  ];

  const emitButton = () => {
    submitButtonRef.current?.click();
  };

  return (
    <>
      <div className="relative min-h-[400px]">
        {path === "agent" && (
          <div className="overflow-x-auto max-h-[500px] mb-2 rounded-md border">
            <Table>
              <TableBody>
                <TableRow className="border-b">
                  <TableHead className="bg-gray-300 text-center w-1/2 border-r font-bold text-black">
                    {t("t_share_type")}
                  </TableHead>
                  <TableCell className="text-center w-1/2 text-black">
                    {lowerUser?.share_type
                      ? t("t_share_true")
                      : t("t_share_false")}
                  </TableCell>
                </TableRow>
                <TableRow className="border-b">
                  <TableHead className="bg-gray-300 text-center w-1/2 border-r font-bold text-black">
                    {t("t_share_rate")}
                  </TableHead>
                  <TableCell className="text-center w-1/2 text-black">
                    {lowerUser?.share_rate ? lowerUser?.share_rate + "%" : "0%"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        <div className="overflow-x-auto max-h-[500px]">
          <DataTable columns={columns} data={upperLowerUsers} />
        </div>
        <div className="w-full overflow-x-auto max-h-[500px] mt-10 ">
          <fieldset disabled={isLoading}>
            <form onSubmit={handleSubmit(onSubmitValidate)}>
              <Table className="table-fixed min-w-[700px] rounded-md border">
                <TableHeader className="bg-black">
                  <TableRow>
                    <TableHead className="!text-center !text-white">
                      {t("t_amount")}
                    </TableHead>
                    <TableHead className="!text-center !text-white">
                      {t("t_share_amount")}
                    </TableHead>
                    <TableHead className="!text-center !text-white">
                      {t("t_source")}
                    </TableHead>
                    <TableHead className="!text-center !text-white">
                      {t("t_remark")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="!text-center">
                      <InputField
                        id="amount"
                        labelWidth=""
                        type="text"
                        horizontal={false}
                        required={false}
                        registerProps={register("amount", {
                          setValueAs: (v) => (v === "" ? undefined : Number(v)),
                        })}
                        placeholder="0"
                        max={TOP_UP_AMOUNT_MAX}
                        error={translateError(t, "t_amount", errors.amount)}
                        onFocus={(e) => {
                          if (e.target.value === "0") {
                            e.target.value = "";
                            const event = new Event("input", { bubbles: true });
                            e.target.dispatchEvent(event);
                          }
                        }}
                        onInput={(e) => {
                          const val = e.currentTarget.value;
                          // If value starts with 0 and has other digits, strip the leading zeros
                          if (val.startsWith("0")) {
                            e.currentTarget.value = val.replace(/^0+/, "");
                            const event = new Event("input", { bubbles: true });
                            e.currentTarget.dispatchEvent(event);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="!text-center">
                      <span className="text-lg">{displayCalculateAmount}</span>
                    </TableCell>
                    <TableCell className="!text-center">
                      <div className="flex flex-col items-center">
                        <Controller
                          name="status"
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <ErrorTooltip
                                  error={translateError(
                                    t,
                                    "t_source",
                                    errors.status,
                                  )}
                                >
                                  <SelectTrigger
                                    className={`w-full ${
                                      fieldState.error
                                        ? "!border-red-400 !ring-red-400 !focus:ring-red-400 !focus-visible:ring-red-200"
                                        : "!focus:ring-blue-500 !focus-visible:ring-blue-200"
                                    }`}
                                  >
                                    <SelectValue
                                      placeholder={t("common_please_select")}
                                    />
                                  </SelectTrigger>
                                </ErrorTooltip>
                                <SelectContent>
                                  <SelectItem value="1">
                                    {t("t_point_up")}
                                  </SelectItem>
                                  <SelectItem value="2">
                                    {t("t_point_down")}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </>
                          )}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="!text-center">
                      <InputField
                        id="remark"
                        label=""
                        labelWidth=""
                        type="text"
                        horizontal={false}
                        required={false}
                        registerProps={register("remark")}
                        error={translateError(t, "t_remark", errors.remark)}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <button
                ref={submitButtonRef}
                type="submit"
                className="hidden"
              ></button>
            </form>
          </fieldset>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="info"
            type="submit"
            disabled={isLoading}
            onClick={emitButton}
          >
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
        message={t("t_success_modify")}
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

export default TopUp;
