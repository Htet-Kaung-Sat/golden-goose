import { getOperationLog } from "@/api/admin/operation-log";
import { getUser } from "@/api/admin/user";
import BasePagination from "@/components/shared/BasePagination";
import CommonSearchPanel from "@/components/shared/CommonSearchPanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { OperationLogs } from "@/types/OperationLog";
import { User } from "@/types/User";
import { ExportColumn, exportExcel, ExportTable } from "@/utils/exportExcelJs";
import { ColumnDef } from "@tanstack/react-table";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Operation log: search by date range and option, paginated table, export.
 */
const OperationLog = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [operationLog, setOperationLog] = useState<OperationLogs[]>([]);
  const [operatorAccount, setOperatorAccount] = useState("");
  const [operatedAccount, setOperatedAccount] = useState("");
  const [ipLocation, setIpLocation] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [searchData, setSearchData] = useState({});
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
  const didFetch = useRef(false);
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const options = [
    { value: "all", label: t("op_all") },
    { value: "topup", label: t("op_topup") },
    { value: "modify", label: t("op_modify_status") },
    { value: "login", label: t("op_login") },
    { value: "wash_code", label: t("op_modify_wash_code") },
    { value: "recalculation", label: t("op_recalculate") },
    { value: "cancel", label: t("op_cancel") },
  ];
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-30" : "md:w-25";
  useEffect(() => {
    if (!didFetch.current) {
      const fetchInit = async () => {
        try {
          await getUser(Number(loginUser?.id));
        } catch (error) {
          setErrorFromResponse(error);
          setIsLoading(false);
        }
      };
      fetchInit();
      didFetch.current = true;
    }
  }, [loginUser?.id, setErrorFromResponse, setIsLoading]);

  const handlePageChange = async (page: number) => {
    if (currentPage !== page) {
      setCurrentPage(page);
      const finalStartStr = startDate;
      const finalEndStr = endDate;
      await handleSearch(finalStartStr, finalEndStr, page, pageSize);
    }
  };

  const handleLimitChange = async (limit: number) => {
    if (limit !== pageSize) {
      setPageSize(limit);
      setCurrentPage(1);
      const finalStartStr = startDate;
      const finalEndStr = endDate;
      await handleSearch(finalStartStr, finalEndStr, 1, limit);
    }
  };

  const handleSearch = async (
    startDate: string,
    endDate: string,
    commonPage?: number | undefined,
    commonPageSize?: number | undefined,
  ) => {
    setStartDate(startDate);
    setEndDate(endDate);
    setCurrentPage(commonPage ? commonPage : 1);
    const filters = {
      startDate,
      endDate,
      operatorAccount,
      operatedAccount,
      ipLocation,
      selectedAction,
      page: commonPage,
      limit: commonPageSize,
    };
    try {
      setIsLoading(true);
      const result = await getOperationLog(filters);
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
        delete filters.page;
        delete filters.limit;
        setSearchData(filters);
        setOperationLog(result.data.operationLogs);
        setTotalItems(result.data.pagination.total);
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const msg = String(data?.message ?? t("no_data"));
        const displayMessage = msg === "查无资料" ? t("no_data") : msg;
        setErrorFromResponse(displayMessage);
      } else {
        setErrorFromResponse(error);
      }
      setIsLoading(false);
    }
  };

  const operationLogExportCols: readonly ExportColumn<OperationLogs>[] = [
    {
      header: "No",
      accessor: "id",
    },
    {
      header: t("op_account"),
      accessor: "operator" as keyof OperationLogs & string,
      format: (_, row) => row.operator?.account ?? "",
    },
    {
      header: t("op_action"),
      accessor: "action_display",
    },
    {
      header: t("op_target_account"),
      accessor: "operatedUser" as keyof OperationLogs & string,
      format: (_, row) => row.operatedUser?.account ?? "",
    },
    {
      header: t("op_description"),
      accessor: "description",
      width: 80,
      format: (value) =>
        String(value ?? "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/&nbsp;/g, " "),
    },
    {
      header: t("op_id"),
      accessor: "operation_id",
    },
    {
      header: t("op_time"),
      accessor: "createdAt",
      format: (_, row) => dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      header: t("op_ip_address"),
      accessor: "ip_location",
    },
  ] as const;

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await getOperationLog(searchData);
      const tables: ExportTable<object>[] = [
        {
          title: t("br_title"),
          columns: operationLogExportCols as readonly ExportColumn<object>[],
          data: result.data.operationLogs,
        },
      ];
      exportExcel(
        {
          fileName: `${t("br_title")}_${new Date().getTime()}`,
          startDate,
          endDate,
          lang: lang,
          fileType: "xls",
          gridFlg: false,
        },
        tables,
      );
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<OperationLogs>[] = [
    {
      accessorKey: "id",
      header: "No",
    },
    {
      accessorKey: "operator.account",
      header: t("op_account"),
    },
    {
      accessorKey: "action_display",
      header: t("op_action"),
    },
    {
      accessorKey: "operatedUser.account",
      header: t("op_target_account"),
    },
    {
      accessorKey: "description",
      header: t("op_description"),
      cell: ({ getValue }) => {
        const rawString = String(getValue());
        const lines = rawString.split(/<br\s*\/?>/i);

        return (
          <span>
            {lines.map((line, index) => (
              <React.Fragment key={index}>
                {line}
                {index < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      },
    },
    {
      accessorKey: "operation_id",
      header: t("op_id"),
    },
    {
      accessorKey: "createdAt",
      header: t("op_time"),
      cell: ({ row }) =>
        dayjs(row.original.createdAt).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      accessorKey: "ip_location",
      header: t("op_ip_address"),
    },
  ];

  return (
    <>
      <CommonSearchPanel
        key={searchKey}
        onSearch={handleSearch}
        onExport={handleExport}
        initFlg={true}
        commonPage={currentPage}
        commonPageSize={pageSize}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-x-14 gap-y-4 mb-3">
          <InputField
            id="operator_account"
            label={t("op_account")}
            labelWidth={dynamicLabelWidth}
            type="text"
            inputClassName="w-full"
            required={false}
            defaultValue={operatorAccount}
            onChange={(e) => {
              setOperatorAccount(e.target.value);
            }}
          />
          <InputField
            id="operated_account"
            label={t("op_target_account")}
            labelWidth={dynamicLabelWidth}
            inputClassName="w-full"
            required={false}
            defaultValue={operatedAccount}
            onChange={(e) => {
              setOperatedAccount(e.target.value);
            }}
          />
          <InputField
            id="ip_address"
            label={t("op_ip_address")}
            labelWidth={dynamicLabelWidth}
            inputClassName="w-full"
            required={false}
            defaultValue={ipLocation}
            onChange={(e) => {
              setIpLocation(e.target.value);
            }}
          />
          <SelectField
            id="actions"
            label={t("op_action")}
            selectWidth="md:w-46 sm:w-48 xl:w-full"
            labelClassName="w-46 xl:w-30"
            horizontal={false}
            required={false}
            options={options}
            value={selectedAction}
            autoSelectFirst={true}
            onChange={(newValue) => setSelectedAction(newValue)}
          />
        </div>
      </CommonSearchPanel>
      <div className="mt-4">
        <DataTable
          columns={columns}
          data={operationLog}
          title={t("op_title")}
        />
      </div>
      <div className="sticky bottom-0 bg-white border-t p-4 flex justify-between items-center">
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
        onClose={() => {
          setErrorDialogOpen(false);
          setOperatorAccount("");
          setOperatedAccount("");
          setIpLocation("");
          setSelectedAction("");
          handleReload();
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};

export default OperationLog;
