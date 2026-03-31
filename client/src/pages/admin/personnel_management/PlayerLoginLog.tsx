import { getLoginInfos } from "@/api/admin/login-info";
import BasePagination from "@/components/shared/BasePagination";
import CommonSearchPanel from "@/components/shared/CommonSearchPanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { LoginInfo } from "@/types/LoginInfo";
import { User } from "@/types/User";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
/**
 * Player login log: search by date range, account, IP; paginated login history table.
 */
const PlayerLoginLog = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetAccount, setTargetAccount] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [playerLoginLogs, setPlayerLoginLogs] = useState<LoginInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorMessage,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const { t } = useTranslation();

  /** Changes page and refetches login logs. */
  const handlePageChange = async (page: number) => {
    if (currentPage !== page) {
      setCurrentPage(page);
      const finalStartStr = startDate;
      const finalEndStr = endDate;
      await handleSearch(finalStartStr, finalEndStr, page, pageSize);
    }
  };

  /** Changes page size and refetches from first page. */
  const handleLimitChange = async (limit: number) => {
    if (limit !== pageSize) {
      setPageSize(limit);
      setCurrentPage(1);
      const finalStartStr = startDate;
      const finalEndStr = endDate;
      await handleSearch(finalStartStr, finalEndStr, 1, limit);
    }
  };

  /** Fetches login infos by date range, account, IP with pagination; validates day_limit. */
  const handleSearch = async (
    startDate: string,
    endDate: string,
    commonPage?: number | undefined,
    commonPageSize?: number | undefined,
  ) => {
    setStartDate(startDate);
    setEndDate(endDate);
    setCurrentPage(commonPage ? commonPage : 1);
    setPlayerLoginLogs([]);
    const filters = {
      startDate,
      endDate,
      targetAccount,
      ipAddress,
      page: commonPage,
      limit: commonPageSize,
      allHierarchy: true,
      include: "user",
      order: "id:DESC",
    };
    try {
      setIsLoading(true);
      const result = await getLoginInfos(filters);
      let dayDiff = 0;
      if (startDate) {
        /** Business-day start (7am) for date. */
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
        setPlayerLoginLogs(result.data.loginInfos);
        setCurrentPage(result.data.pagination.page);
        setTotalItems(result.data.pagination.total);
      }
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };
  const columns: ColumnDef<LoginInfo>[] = [
    {
      accessorKey: "serial_number",
      header: t("pll_id"),
      size: 100,
    },
    {
      accessorKey: "user.account",
      header: t("pll_account"),
    },
    {
      accessorKey: "state",
      header: t("pll_state"),
      cell: ({ getValue }) => {
        const data = String(getValue() || "");
        return data === "登录"
          ? t("pll_success")
          : data === "失败"
            ? t("pll_fail")
            : data === "禁止登录"
              ? t("pll_denied")
              : "";
      },
    },
    {
      accessorKey: "createdAt",
      header: t("pll_time"),
      size: 100,
      cell: ({ getValue }) => {
        return <span>{formatLocalDateTime(String(getValue()))}</span>;
      },
    },
    {
      accessorKey: "equipment",
      header: t("pll_device"),
      size: 100,
    },
    {
      accessorKey: "browser",
      header: t("pll_browser"),
      size: 100,
    },
    {
      accessorKey: "ip_address",
      header: t("pll_ip_location"),
      size: 100,
    },
  ];
  return (
    <>
      <div>
        <CommonSearchPanel
          onSearch={handleSearch}
          initFlg={true}
          showButton={false}
          commonPage={currentPage}
          commonPageSize={pageSize}
        >
          <div className="flex flex-wrap gap-3">
            <div>
              <InputField
                id="targetAccountInput"
                label={t("pll_account")}
                defaultValue={targetAccount}
                required={false}
                labelWidth=""
                inputWidth="w-70"
                onChange={(e) => {
                  setTargetAccount(e.target.value);
                }}
              />
            </div>
            <div>
              <InputField
                id="ipAddressInput"
                label={t("pll_ip_location")}
                defaultValue={ipAddress}
                required={false}
                labelWidth=""
                inputWidth="w-70"
                onChange={(e) => {
                  setIpAddress(e.target.value);
                }}
              />
            </div>
          </div>
        </CommonSearchPanel>
        <div className="mt-2 mb-1">
          <DataTable
            columns={columns}
            data={playerLoginLogs}
            title={t("pll_title")}
          />
        </div>
        <BasePagination
          currentPage={currentPage}
          totalItems={totalItems}
          initialLimit={pageSize}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
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
export default PlayerLoginLog;
