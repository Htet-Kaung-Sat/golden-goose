import { getDailyReports } from "@/api/admin/bet-result";
import CommonSearchPanel from "@/components/shared/CommonSearchPanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import type { DailyReports } from "@/types";
import { User } from "@/types/User";
import { ColumnDef } from "@tanstack/react-table";
import { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Daily report: search by date range, day_limit check, table of daily report rows.
 */
const DailyReport = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [customerAccount, setCustomerAccount] = useState("");
  const [dailyReports, setDailyReports] = useState<DailyReports[]>([]);
  const [searchKey, setSearchKey] = useState(0);
  const handleReload = () => {
    setSearchKey((prev) => prev + 1);
  };
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorMessage,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const { t } = useTranslation();
  useEffect(() => {
    setIsLoading(false);
  });

  const handleSearch = async (startDate: string, endDate: string) => {
    const filters = {
      startDate,
      endDate,
      customerAccount,
    };
    try {
      setIsLoading(true);
      const result = await getDailyReports(filters);
      let dayDiff = 0;
      if (startDate) {
        const getAdjustedDate = (dateInput: string | Date) => {
          const d = new Date(dateInput);
          if (d.getHours() < 7) {
            d.setDate(d.getDate() - 1);
          }
          d.setHours(7, 0, 0, 0);
          return d;
        };
        const adjustedStart = getAdjustedDate(startDate);
        const adjustedNow = getAdjustedDate(new Date());

        const diffInMs = adjustedNow.getTime() - adjustedStart.getTime();
        dayDiff = Math.round(diffInMs / (1000 * 60 * 60 * 24));
      }
      setIsLoading(false);
      if (
        loginUser?.day_limit &&
        (dayDiff > loginUser?.day_limit ||
          (loginUser?.day_limit > 0 && startDate === ""))
      ) {
        setErrorMessage(
          t("common_day_error_part1") +
            loginUser?.day_limit +
            t("common_day_error_part2"),
        );
        setErrorDialogOpen(true);
      } else {
        setDailyReports(result.data.dailyReports ?? []);
      }
      setIsLoading(false);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const msg = String(data?.message ?? t("no_data"));
        const displayMessage =
          msg === "查无资料" ? t("no_data") : msg || t("no_data");
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<DailyReports>[] = [
    { accessorKey: "date", header: t("dr_date") },
    { accessorKey: "total_amount", header: t("dr_total_bets") },
    { accessorKey: "valid_total_amount", header: t("dr_valid_bets") },
    {
      accessorKey: "wash_code_amount",
      header: t("dr_wash_code_amount"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
    {
      accessorKey: "win_lose_total_amount",
      header: t("dr_wins_losses"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "text-red-500" : ""}>
            {data ? parseFloat(Number(data).toFixed(3)).toString() : 0}
          </span>
        );
      },
    },
    {
      accessorKey: "wash_code_payment",
      header: t("dr_wash_code_payment"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
    {
      accessorKey: "total_win_lose",
      header: t("dr_total_wins_losses"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "text-red-500" : ""}>
            {data ? parseFloat(Number(data).toFixed(3)).toString() : 0}
          </span>
        );
      },
    },
  ];
  return (
    <>
      <div>
        <div>
          <CommonSearchPanel
            key={searchKey}
            onSearch={handleSearch}
            initFlg={false}
            includeTime={false}
          >
            <InputField
              id="customerAccountInput"
              label={t("dr_account")}
              defaultValue={customerAccount}
              required={false}
              labelWidth=""
              inputWidth="w-50"
              onChange={(e) => {
                setCustomerAccount(e.target.value);
              }}
            />
          </CommonSearchPanel>
        </div>
        <div className="mt-3">
          <DataTable columns={columns} data={dailyReports} />
        </div>
      </div>
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
          setCustomerAccount("");
          setDailyReports([]);
          handleReload();
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};

export default DailyReport;
