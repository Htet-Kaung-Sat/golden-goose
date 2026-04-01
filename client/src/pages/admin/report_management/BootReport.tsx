import { ExportColumn, exportExcel, ExportTable } from "@/utils/exportExcelJs";
import { getDesks } from "@/api/admin/desk";
import { getBootReports } from "@/api/admin/game-session";
import CommonSearchPanel from "@/components/shared/CommonSearchPanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import SelectField from "@/components/shared/SelectField";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { BootReports, Desk } from "@/types";
import { User } from "@/types/User";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBusinessEndDate, getBusinessStartDate } from "@/utils/BusinessDate";
import { formatLocalDateTime } from "@/utils/DateFormat";
interface SearchFilters {
  startDate?: string;
  endDate?: string;
  deskId?: number;
}

/**
 * Boot report: search by date range, desk list init, table and export.
 */
const BootReport = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bootReports, setBootReports] = useState<BootReports[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [selectedDesk, setSelectedDesk] = useState<string>("");
  const [searchData, setSearchData] = useState<SearchFilters>({});
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

  useEffect(() => {
    if (!didFetch.current) {
      const now = new Date();
      const start = getBusinessStartDate(now, "today");
      const end = getBusinessEndDate(now, "today");
      setStartDate(formatLocalDateTime(String(start)));
      setEndDate(formatLocalDateTime(String(end)));
      const fetchDeskList = async () => {
        try {
          const result = await getDesks();
          const desksData: Desk[] = result.data.desks || [];
          setDesks(desksData);
          setIsLoading(false);
        } catch (error) {
          setErrorFromResponse(error);
          setIsLoading(false);
        }
      };
      fetchDeskList();
      didFetch.current = true;
    }
  }, [setErrorFromResponse, setIsLoading]);

  const handleSearch = async (startDate: string, endDate: string) => {
    setStartDate(startDate);
    setEndDate(endDate);
    const filters = {
      startDate,
      endDate,
      deskId: parseInt(selectedDesk),
    };
    try {
      setIsLoading(true);
      const result = await getBootReports(filters);
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
      } else if (selectedDesk) {
        setSearchData(filters);
        setBootReports(result.data.bootReports);
      } else {
        setBootReports([]);
      }
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };
  const bootReportsExportCols: readonly ExportColumn<BootReports>[] = [
    { accessor: "shoe_size", header: t("br_number") },
    {
      accessor: "total_amount",
      header: t("br_bet"),
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "valid_total_amount",
      header: t("br_valid_bet"),
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "win_lose_total_amount",
      header: t("br_win_lose"),
      format: (value: unknown) => (value ? Number(value) : 0),
    },
    {
      accessor: "wash_code_volume",
      header: t("br_wash_code_volume"),
      format: (value: unknown) =>
        value ? parseFloat(Number(value).toFixed(3)) : 0,
    },
    {
      accessor: "commission_fee",
      header: t("br_commission"),
      format: (value: unknown) =>
        value ? parseFloat(Number(value).toFixed(3)) : 0,
    },
  ];
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await getBootReports(searchData);
      let bootReportsExports = result.data.bootReports;
      if (!searchData.deskId) {
        bootReportsExports = [];
      }
      if (bootReportsExports.length > 0) {
        const sum = (key: keyof BootReports) =>
          bootReports.reduce((acc, d) => acc + Number(d[key] || 0), 0);
        bootReportsExports.push({
          id: -1,
          shoe_size: t("br_total"),
          total_amount: sum("total_amount"),
          valid_total_amount: sum("valid_total_amount"),
          win_lose_total_amount: sum("win_lose_total_amount"),
          wash_code_volume: sum("wash_code_volume"),
          commission_fee: sum("commission_fee"),
        });
      }
      const tables: ExportTable<object>[] = [
        {
          title: t("br_title"),
          columns: bootReportsExportCols as readonly ExportColumn<object>[],
          data: bootReportsExports,
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

  const totals = useMemo(() => {
    if (!bootReports.length) return null;
    const sum = (key: keyof BootReports) =>
      bootReports.reduce((acc, d) => acc + Number(d[key] || 0), 0);
    return {
      id: -1,
      shoe_size: t("br_total"),
      total_amount: sum("total_amount"),
      valid_total_amount: sum("valid_total_amount"),
      win_lose_total_amount: sum("win_lose_total_amount"),
      wash_code_volume: sum("wash_code_volume"),
      commission_fee: sum("commission_fee"),
    } as BootReports;
  }, [bootReports, t]);

  const bootReportTotals = useMemo(
    () => (totals ? [...bootReports, totals] : bootReports),
    [bootReports, totals],
  );

  const columns: ColumnDef<BootReports>[] = [
    { accessorKey: "shoe_size", header: t("br_number") },
    { accessorKey: "total_amount", header: t("br_bet") },
    { accessorKey: "valid_total_amount", header: t("br_valid_bet") },
    {
      accessorKey: "win_lose_total_amount",
      header: t("br_win_lose"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "text-red-500" : ""}>
            {data ? data : 0}
          </span>
        );
      },
    },
    {
      accessorKey: "wash_code_volume",
      header: t("br_wash_code_volume"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
    {
      accessorKey: "commission_fee",
      header: t("br_commission"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
  ];

  return (
    <>
      <CommonSearchPanel
        key={searchKey}
        onSearch={handleSearch}
        onExport={handleExport}
        initFlg={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
          <SelectField
            id="desk_id"
            label={t("br_table")}
            required={false}
            value={selectedDesk}
            labelWidth=""
            onChange={(newValue) => setSelectedDesk(newValue)}
            options={desks.map((d) => ({
              value: String(d.id),
              label: d.name,
            }))}
            selectWidth="w-50"
            placeholder={t("br_select_holder")}
          />
        </div>
      </CommonSearchPanel>
      <div className="mt-1">
        <DataTable
          columns={columns}
          data={bootReportTotals}
          title={t("br_title")}
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

export default BootReport;
