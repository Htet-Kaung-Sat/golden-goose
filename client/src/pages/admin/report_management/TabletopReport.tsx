import { ExportColumn, exportExcel, ExportTable } from "@/utils/exportExcelJs";
import { getTabletopReports } from "@/api/admin/desk";
import "@/assets/css/report_management/tabletop.css";
import CommonSearchPanel from "@/components/shared/CommonSearchPanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { TabletopReports } from "@/types";
import { User } from "@/types/User";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Tabletop report: search by date range, table by desk with totals, export.
 */
const TabletopReport = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tabletopReports, setTabletopReports] = useState<TabletopReports[]>([]);
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
  const columns: ColumnDef<TabletopReports>[] = [
    { accessorKey: "desk_no", header: t("tr_no") },
    {
      accessorKey: "name",
      header: t("tr_name"),
      cell: ({ row }) => {
        const content = row.original.name;
        const isTotalsRow = row.original.desk_no === "";
        return (
          <div className={isTotalsRow ? "merged-content-wrapper" : ""}>
            {content}
          </div>
        );
      },
    },
    { accessorKey: "total_amount", header: t("tr_bet") },
    { accessorKey: "valid_total_amount", header: t("tr_valid_bet") },
    {
      accessorKey: "win_lose_total_amount",
      header: t("tr_win_lose"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "text-red-500" : ""}>{data ? data : 0}</span>
        );
      },
    },
    {
      accessorKey: "wash_code_volume",
      header: t("tr_wash_code_volume"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
    { accessorKey: "water_bill", header: t("tr_fee") },
  ];
  const totals = useMemo(() => {
    if (!tabletopReports.length) return null;
    const sum = (key: keyof TabletopReports) =>
      tabletopReports.reduce((acc, d) => acc + Number(d[key] || 0), 0);
    return {
      id: -1,
      desk_no: "",
      name: t("tr_total"),
      total_amount: sum("total_amount"),
      valid_total_amount: sum("valid_total_amount"),
      win_lose_total_amount: sum("win_lose_total_amount"),
      wash_code_volume: sum("wash_code_volume"),
      water_bill: sum("water_bill"),
    } as TabletopReports;
  }, [tabletopReports, t]);

  const tableTopTotals = useMemo(
    () => (totals ? [...tabletopReports, totals] : tabletopReports),
    [tabletopReports, totals],
  );
  const handleSearch = async (startDate: string, endDate: string) => {
    setStartDate(startDate);
    setEndDate(endDate);
    setTabletopReports([]);
    const filters = {
      startDate,
      endDate,
    };
    try {
      setIsLoading(true);
      const result = await getTabletopReports(filters);
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
        setSearchData(filters);
        setTabletopReports(result.data.tabletopReports);
      }
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };
  const tabletopReportsExportCols: readonly ExportColumn<TabletopReports>[] = [
    { accessor: "desk_no", header: t("tr_no"), width: lang === "en" ? 9 : 5 },
    { accessor: "name", header: t("tr_name"), width: lang === "en" ? 11 : 5 },
    {
      accessor: "total_amount",
      header: t("tr_bet"),
      width: lang === "en" ? 8 : 8,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "valid_total_amount",
      header: t("tr_valid_bet"),
      width: lang === "en" ? 10 : 10,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "win_lose_total_amount",
      header: t("tr_win_lose"),
      width: lang === "en" ? 10 : 8,
      format: (v) => (v ? Number(v) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
    {
      accessor: "wash_code_volume",
      header: t("tr_wash_code_volume"),
      width: lang === "en" ? 18 : 8,
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
    },
    {
      accessor: "water_bill",
      header: t("tr_fee"),
      width: lang === "en" ? 10 : 6,
      format: (v) => (v ? Number(v) : 0),
    },
  ];
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await getTabletopReports(searchData);
      const tableTops = result.data.tabletopReports;
      const sum = (key: keyof TabletopReports) =>
        tabletopReports.reduce((acc, d) => acc + Number(d[key] || 0), 0);
      tableTops.push({
        id: -1,
        desk_no: t("tr_total"),
        name: "",
        total_amount: sum("total_amount"),
        valid_total_amount: sum("valid_total_amount"),
        win_lose_total_amount: sum("win_lose_total_amount"),
        wash_code_volume: sum("wash_code_volume"),
        water_bill: sum("water_bill"),
      });
      const tables: ExportTable<object>[] = [
        {
          title: t("tr_title"),
          columns: tabletopReportsExportCols as readonly ExportColumn<object>[],
          data: tableTops,
        },
      ];
      exportExcel(
        {
          fileName: `${t("tabletop_report")}_${new Date().getTime()}`,
          startDate,
          endDate,
          lang: lang,
          fileType: "xls",
          mode: "single",
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
  return (
    <>
      <CommonSearchPanel
        key={searchKey}
        onSearch={handleSearch}
        onExport={handleExport}
        initFlg={true}
        commonPage={0}
        commonPageSize={0}
      ></CommonSearchPanel>
      <div className="mt-2">
        <DataTable
          columns={columns}
          data={tableTopTotals}
          title={t("tr_title")}
        />
      </div>
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
          handleReload();
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};

export default TabletopReport;
