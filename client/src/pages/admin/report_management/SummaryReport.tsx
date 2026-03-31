import { ExportColumn, exportExcel, ExportTable } from "@/utils/exportExcelJs";
import { getSummaryReports } from "@/api/admin/bet-result";
import "@/assets/css/report_management/tabletop.css";
import CommonSearchPanel from "@/components/shared/CommonSearchPanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { DirectMembers, SummaryReports, TotalData } from "@/types";
import { User } from "@/types/User";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";

/**
 * Summary report: search by date range, total data + summary + direct members tables, export.
 */
const SummaryReport = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetAccount, setTargetAccount] = useState("");
  const [totalData, setTotalData] = useState<TotalData[]>([]);
  const [summaryReports, setSummaryReports] = useState<SummaryReports[]>([]);
  const [directMembers, setDirectMembers] = useState<DirectMembers[]>([]);
  const [changeAccount, setChangeAccount] = useState("");
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const handleSearch = async (startDate: string, endDate: string) => {
    const filters = {
      startDate,
      endDate,
      targetAccount,
    };
    setStartDate(startDate);
    setEndDate(endDate);
    setChangeAccount("");
    try {
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
        setIsLoading(true);
        const result = await getSummaryReports(filters);
        if (result.success) {
          setSearchData(filters);
          setTotalData(result.data.totalData);
          setSummaryReports(result.data.summaryReports);
          setDirectMembers(result.data.directMembers);
          setIsLoading(false);
        }
      }
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
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await getSummaryReports(searchData);
      const directMemberExports = result.data.directMembers;
      if (directMemberExports.length > 0) {
        const sum = (key: keyof DirectMembers) =>
          directMembers.reduce((acc, d) => acc + Number(d[key] || 0), 0);
        directMemberExports.push({
          id: -1,
          account: t("sr_total"),
          name: "",
          remaining_amount:
            directMemberExports.length === 0 ? 0 : sum("remaining_amount"),
          total_amount:
            directMemberExports.length === 0 ? 0 : sum("total_amount"),
          valid_total_amount:
            directMemberExports.length === 0 ? 0 : sum("valid_total_amount"),
          wash_code_amount:
            directMemberExports.length === 0
              ? 0
              : parseFloat(Number(sum("wash_code_amount")).toFixed(3)),
          win_lose_total_amount:
            directMembers.length === 0
              ? 0
              : parseFloat(Number(sum("win_lose_total_amount")).toFixed(3)),
          washing_ratio: "",
          wash_code_payment:
            directMemberExports.length === 0
              ? 0
              : parseFloat(Number(sum("wash_code_payment")).toFixed(3)),
          actual_win_lose:
            directMemberExports.length === 0
              ? 0
              : parseFloat(Number(sum("actual_win_lose")).toFixed(3)),
        });
      } else {
        directMemberExports.push({
          id: -1,
          account: t("sr_total"),
          name: "",
          remaining_amount: 0,
          total_amount: 0,
          valid_total_amount: 0,
          wash_code_amount: 0,
          win_lose_total_amount: 0,
          washing_ratio: "",
          wash_code_payment: 0,
          actual_win_lose: 0,
        });
      }
      const tables: ExportTable<object>[] = [
        {
          title: t("sr_title1"),
          columns: totalDataExportCols as readonly ExportColumn<object>[],
          data: result.data.totalData,
        },
        {
          title: t("sr_title2"),
          columns: summaryExportCols as readonly ExportColumn<object>[],
          data: result.data.summaryReports,
        },
        {
          title: t("sr_title3"),
          columns: directMemberExportCols as readonly ExportColumn<object>[],
          data: directMemberExports,
        },
      ];
      exportExcel(
        {
          fileName: `${t("summary_report")}_${new Date().getTime()}`,
          startDate,
          endDate,
          lang: lang,
          mode: "single",
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

  const totalDataExportCols: readonly ExportColumn<TotalData>[] = [
    {
      accessor: "total_amount",
      header: t("sr_total_amount"),
      format: (v) => (v ? Number(v) : 0),
      width: lang === "en" ? 18 : 15,
    },
    {
      accessor: "valid_total_amount",
      header: t("sr_valid_total_amount"),
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "wash_code_amount",
      header: t("sr_wash_code_amount"),
      width: lang === "en" ? 20 : 9,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
    },
    {
      accessor: "win_lose_total_amount",
      header: t("sr_win_lose_total_amount"),
      width: lang === "en" ? 18 : 11,
      format: (v) => (v ? Number(v) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
    {
      accessor: "wash_code_payment",
      header: t("sr_wash_code_payment"),
      width: lang === "en" ? 15 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
    },
    {
      accessor: "total_win_lose",
      header: t("sr_total_win_lose"),
      width: lang === "en" ? 20 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
  ] as const;

  const summaryExportCols: readonly ExportColumn<SummaryReports>[] = [
    {
      accessor: "account",
      header: t("sr_account"),
      width: lang === "en" ? 18 : 15,
    },
    { accessor: "name", header: t("sr_name") },
    {
      accessor: "remaining_amount",
      header: t("sr_remaining_amount"),
      width: lang === "en" ? 20 : 9,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "total_balance",
      header: t("sr_total_balance"),
      width: lang === "en" ? 18 : 11,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "total_amount",
      header: t("sr_total_amount"),
      width: lang === "en" ? 15 : 11,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "valid_total_amount",
      header: t("sr_valid_total_amount"),
      width: lang === "en" ? 20 : 11,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "wash_code_amount",
      header: t("sr_wash_code_amount"),
      width: lang === "en" ? 20 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
    },
    {
      accessor: "win_lose_total_amount",
      header: t("sr_win_lose_total_amount"),
      width: lang === "en" ? 18 : 11,
      format: (v) => (v ? Number(v) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
    {
      accessor: "washing_ratio",
      header: t("sr_washing_ratio"),
      width: lang === "en" ? 17 : 11,
      format: (_, row: SummaryReports) => {
        const bonusType = row.bonus_type;
        const rate = Number(row.bonus_rate ?? 0);
        if (bonusType === "single") return t("sr_bonus_one") + rate + "%";
        if (bonusType === "both") return t("sr_bonus_two") + rate + "%";
        return "0%";
      },
    },
    {
      accessor: "wash_code_payment",
      header: t("sr_wash_code_payment"),
      width: lang === "en" ? 16 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
    },
    {
      accessor: "actual_win_lose",
      header: t("sr_total_win_lose"),
      width: lang === "en" ? 16 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
    {
      accessor: "account_for",
      header: t("sr_account_for"),
      width: lang === "en" ? 11 : 11,
      format: (value: unknown) => {
        if (!value) return 0;
        const numericValue =
          typeof value === "string"
            ? parseFloat(value.replace("%", ""))
            : Number(value);
        return numericValue / 100;
      },
      numFmt: "0%",
    },
    {
      accessor: "divided_into",
      header: t("sr_divided_into"),
      width: lang === "en" ? 14 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
    {
      accessor: "share",
      header: t("sr_share"),
      width: lang === "en" ? 18 : 11,
      format: (value: unknown) => {
        if (!value) return 0;
        const numericValue =
          typeof value === "string"
            ? parseFloat(value.replace("%", ""))
            : Number(value);
        return numericValue / 100;
      },
      numFmt: "0%",
    },
    {
      accessor: "superior_divide",
      header: t("sr_superior_divide"),
      width: lang === "en" ? 22 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
  ] as const;

  const directMemberExportCols: readonly ExportColumn<DirectMembers>[] = [
    {
      accessor: "account",
      header: t("sr_account"),
      width: lang === "en" ? 18 : 15,
    },
    { accessor: "name", header: t("sr_name") },
    {
      accessor: "remaining_amount",
      header: t("sr_remaining_amount"),
      width: lang === "en" ? 20 : 9,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "total_amount",
      header: t("sr_total_amount"),
      width: lang === "en" ? 18 : 11,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "valid_total_amount",
      header: t("sr_valid_total_amount"),
      width: lang === "en" ? 14 : 11,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "wash_code_amount",
      header: t("sr_wash_code_amount"),
      width: lang === "en" ? 20 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
    },
    {
      accessor: "win_lose_total_amount",
      header: t("sr_win_lose_total_amount"),
      width: lang === "en" ? 20 : 11,
      format: (v) => (v ? Number(v) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
    {
      accessor: "washing_ratio",
      header: t("sr_washing_ratio"),
      width: lang === "en" ? 18 : 11,
      format: (_, row: DirectMembers) => {
        const bonusType = row.bonus_type;
        const rate = Number(row.bonus_rate ?? 0);
        if (bonusType === "single") return t("sr_bonus_one") + rate + "%";
        if (bonusType === "both") return t("sr_bonus_two") + rate + "%";
        return "";
      },
    },
    {
      accessor: "wash_code_payment",
      header: t("sr_wash_code_payment"),
      width: lang === "en" ? 17 : 11,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
    },
    {
      accessor: "actual_win_lose",
      header: t("sr_total_win_lose"),
      width: lang === "en" ? 16 : 11,
      format: (v) => (v ? Number(v) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
  ] as const;

  const totalDataColumns: ColumnDef<TotalData>[] = [
    { accessorKey: "total_amount", header: t("sr_total_amount") },
    { accessorKey: "valid_total_amount", header: t("sr_valid_total_amount") },
    {
      accessorKey: "wash_code_amount",
      header: t("sr_wash_code_amount"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
    {
      accessorKey: "win_lose_total_amount",
      header: t("sr_win_lose_total_amount"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "font-red" : ""}>{data ? data : 0}</span>
        );
      },
    },
    {
      accessorKey: "wash_code_payment",
      header: t("sr_wash_code_payment"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
    {
      accessorKey: "total_win_lose",
      header: t("sr_total_win_lose"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "font-red" : ""}>
            {data ? parseFloat(Number(data).toFixed(3)).toString() : 0}
          </span>
        );
      },
    },
  ];
  const summaryReportColumns: ColumnDef<SummaryReports>[] = [
    { accessorKey: "account", header: t("sr_account") },
    { accessorKey: "name", header: t("sr_name") },
    { accessorKey: "remaining_amount", header: t("sr_remaining_amount") },
    { accessorKey: "total_balance", header: t("sr_total_balance") },
    { accessorKey: "total_amount", header: t("sr_total_amount") },
    { accessorKey: "valid_total_amount", header: t("sr_valid_total_amount") },
    { accessorKey: "wash_code_amount", header: t("sr_wash_code_amount") },
    {
      accessorKey: "win_lose_total_amount",
      header: t("sr_win_lose_total_amount"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "font-red" : ""}>
            {data ? parseFloat(Number(data).toFixed(3)).toString() : 0}
          </span>
        );
      },
    },
    {
      accessorKey: "washing_ratio",
      header: t("sr_washing_ratio"),
      cell: ({ row }) => {
        const bonusType = row.original.bonus_type;
        if (bonusType === "single") {
          return (
            <p>
              {t("sr_bonus_one") +
                parseFloat(String(row.original.bonus_rate)) +
                "%"}
            </p>
          );
        } else if (bonusType === "both") {
          return (
            <p>
              {t("sr_bonus_two") +
                parseFloat(String(row.original.bonus_rate)) +
                "%"}
            </p>
          );
        }
      },
    },
    { accessorKey: "wash_code_payment", header: t("sr_wash_code_payment") },
    {
      accessorKey: "actual_win_lose",
      header: t("sr_total_win_lose"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "font-red" : ""}>{data ? data : 0}</span>
        );
      },
    },
    { accessorKey: "account_for", header: t("sr_account_for") },
    {
      accessorKey: "divided_into",
      header: t("sr_divided_into"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "font-red" : ""}>{data ? data : 0}</span>
        );
      },
    },
    { accessorKey: "share", header: t("sr_share") },
    {
      accessorKey: "superior_divide",
      header: t("sr_superior_divide"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "font-red" : ""}>{data ? data : 0}</span>
        );
      },
    },
    {
      id: "actions",
      header: t("sr_action"),
      cell: ({ row }) => {
        if (!row.original.action) {
          return null;
        }
        return (
          <Button
            variant="success"
            size="sm"
            onClick={() => {
              setTargetAccount(row.original.account);
              setChangeAccount(row.original.account);
            }}
          >
            {t("sr_sub_agent")}
          </Button>
        );
      },
    },
  ];
  const directMemberColumns: ColumnDef<DirectMembers>[] = [
    { accessorKey: "account", header: t("sr_account") },
    {
      accessorKey: "name",
      header: t("sr_name"),
      cell: ({ row }) => {
        const content = row.original.name;
        const isTotalsRow = row.original.account === "";
        return (
          <div className={isTotalsRow ? "merged-content-wrapper" : ""}>
            {content}
          </div>
        );
      },
    },
    { accessorKey: "remaining_amount", header: t("sr_remaining_amount") },
    { accessorKey: "total_amount", header: t("sr_total_amount") },
    { accessorKey: "valid_total_amount", header: t("sr_valid_total_amount") },
    { accessorKey: "wash_code_amount", header: t("sr_wash_code_amount") },
    {
      accessorKey: "win_lose_total_amount",
      header: t("sr_win_lose_total_amount"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "font-red" : ""}>{data ? data : 0}</span>
        );
      },
    },
    {
      accessorKey: "washing_ratio",
      header: t("sr_washing_ratio"),
      cell: ({ row }) => {
        const bonusType = row.original.bonus_type;
        if (bonusType === "single") {
          return (
            <p>
              {t("sr_bonus_one") +
                parseFloat(String(row.original.bonus_rate)) +
                "%"}
            </p>
          );
        } else if (bonusType === "both") {
          return (
            <p>
              {t("sr_bonus_two") +
                parseFloat(String(row.original.bonus_rate)) +
                "%"}
            </p>
          );
        }
      },
    },
    { accessorKey: "wash_code_payment", header: t("sr_wash_code_payment") },
    {
      accessorKey: "actual_win_lose",
      header: t("sr_total_win_lose"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "font-red" : ""}>{data ? data : 0}</span>
        );
      },
    },
  ];
  const members = useMemo(() => {
    const sum = (key: keyof DirectMembers) =>
      directMembers.reduce((acc, d) => acc + Number(d[key] || 0), 0);
    const totalRow = {
      id: -1,
      account: "",
      name: t("sr_total"),
      remaining_amount:
        directMembers.length === 0 ? 0 : sum("remaining_amount"),
      total_amount: directMembers.length === 0 ? 0 : sum("total_amount"),
      valid_total_amount:
        directMembers.length === 0 ? 0 : sum("valid_total_amount"),
      wash_code_amount:
        directMembers.length === 0
          ? 0
          : parseFloat(Number(sum("wash_code_amount")).toFixed(3)).toString(),
      win_lose_total_amount:
        directMembers.length === 0
          ? 0
          : parseFloat(
              Number(sum("win_lose_total_amount")).toFixed(3),
            ).toString(),
      washing_ratio: "",
      wash_code_payment:
        directMembers.length === 0
          ? 0
          : parseFloat(Number(sum("wash_code_payment")).toFixed(3)).toString(),
      actual_win_lose:
        directMembers.length === 0
          ? 0
          : parseFloat(Number(sum("actual_win_lose")).toFixed(3)).toString(),
    } as DirectMembers;
    return [totalRow];
  }, [directMembers, t]);

  const directMemberTotal = useMemo(
    () => (members.length > 0 ? [...directMembers, ...members] : directMembers),
    [directMembers, members],
  );
  return (
    <>
      <div>
        <CommonSearchPanel
          key={searchKey}
          onSearch={handleSearch}
          onExport={handleExport}
          changeAccount={changeAccount}
          initFlg={true}
        >
          <InputField
            id="targetAccountInput"
            label={t("sr_account1")}
            value={targetAccount}
            required={false}
            labelWidth=""
            inputWidth="w-50"
            onChange={(e) => {
              setTargetAccount(e.target.value);
            }}
          />
        </CommonSearchPanel>
      </div>
      <div className="mt-2">
        <DataTable
          columns={totalDataColumns}
          data={totalData}
          title={t("sr_title1")}
        />
      </div>
      <div className="mt-2">
        <DataTable
          columns={summaryReportColumns}
          data={summaryReports}
          title={t("sr_title2")}
        />
      </div>
      <div className="mt-2">
        <DataTable
          columns={directMemberColumns}
          data={directMemberTotal}
          title={t("sr_title3")}
        />
      </div>
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
          setTargetAccount("");
          handleReload();
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};

export default SummaryReport;
