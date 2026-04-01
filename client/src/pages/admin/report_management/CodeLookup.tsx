import { getCodeLookUps } from "@/api/admin/bet-result";
import { getDesks } from "@/api/admin/desk";
import { getGames } from "@/api/admin/game";
import "@/assets/css/report_management/codelookup.css";
import BasePagination from "@/components/shared/BasePagination";
import CommonSearchPanel from "@/components/shared/CommonSearchPanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { CodeLookups, Desk, Game, SummaryResults } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "@/types/User";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { ExportColumn, exportExcel, ExportTable } from "@/utils/exportExcelJs";
import { AxiosError } from "axios";
/**
 * Code lookup: search by date, desk, game, cancel/recalculation/settlement filters; table and export.
 */
const CodeLookup = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerAccount, setCustomerAccount] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [numberOfMouths, setNumberOfMouths] = useState("");
  const [gameType, setGameType] = useState<string>("");
  const [deskNo, setDeskNo] = useState<string>("");
  const [cancelFlg, setCancelFlg] = useState<string>("");
  const [recalculationFlg, setRecalculationFlg] = useState<string>("");
  const [settlementFlg, setSettlementFlg] = useState<string>("");
  const [games, setGames] = useState<Game[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [codeLookups, setCodeLookUps] = useState<CodeLookups[]>([]);
  const [summaryResults, setSummaryResults] = useState<SummaryResults[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [searchData, setSearchData] = useState({});
  const {
    errorMessage,
    errorDialogOpen,
    setErrorMessage,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const didFetch = useRef(false);
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const dynamicLabelWidth = isEn ? "md:w-20" : "md:w-15";
  const cancels = [
    { id: "all", name: t("common_all") },
    { id: 0, name: t("cl_not_cancelled") },
    { id: 1, name: t("cl_cancelled") },
  ];
  const recalculations = [
    { id: "all", name: t("common_all") },
    { id: 0, name: t("cl_not_recalculated") },
    { id: 1, name: t("cl_recalculated") },
  ];
  const settlements = [
    { id: "all", name: t("common_all") },
    { id: 0, name: t("cl_unsettled") },
    { id: 1, name: t("cl_settled") },
  ];
  const [searchKey, setSearchKey] = useState(0);
  const handleReload = () => {
    setSearchKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (!didFetch.current) {
      const fetchInit = async () => {
        setIsLoading(true);
        try {
          const desk = await getDesks();
          const allDeskOption: Desk = {
            id: Number("all"),
            name: t("common_all"),
          } as Desk;
          setDesks([allDeskOption, ...(desk.data.desks || [])]);
          setGameType("");
          const game = await getGames();
          const allGameOption: Game = {
            id: Number("all"),
            name: t("common_all"),
          } as Game;
          setGames([allGameOption, ...(game.data.games || [])]);
          setIsLoading(false);
        } catch (error) {
          setErrorFromResponse(error);
          setIsLoading(false);
        }
      };
      fetchInit();
      didFetch.current = true;
    }
  }, [setErrorFromResponse, setIsLoading, t]);

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
    currentAccount?: string | undefined,
    currentShoeSize?: string | undefined,
    currentNumberOfMouths?: string | undefined,
    currentGameType?: string | undefined,
    currentDeskNo?: string | undefined,
    currentCancelFlg?: string | undefined,
    currentRecalculationFlg?: string | undefined,
    currentSettlementFlg?: string | undefined,
  ) => {
    setStartDate(startDate);
    setEndDate(endDate);
    setCurrentPage(commonPage ? commonPage : 1);
    setCodeLookUps([]);
    const filters = {
      startDate,
      endDate,
      customerAccount:
        currentAccount !== undefined ? currentAccount : customerAccount,
      shoeSize: currentShoeSize !== undefined ? currentShoeSize : shoeSize,
      numberOfMouths:
        currentNumberOfMouths !== undefined
          ? currentNumberOfMouths
          : numberOfMouths,
      gameType:
        Number(currentGameType) === 0
          ? undefined
          : currentGameType !== undefined
            ? parseInt(currentGameType)
            : parseInt(gameType),
      deskNo:
        Number(currentDeskNo) === 0
          ? undefined
          : currentDeskNo !== undefined
            ? parseInt(currentDeskNo)
            : parseInt(deskNo),
      cancelFlg:
        currentCancelFlg !== undefined
          ? parseInt(currentCancelFlg)
          : parseInt(cancelFlg),
      recalculationFlg:
        currentRecalculationFlg !== undefined
          ? parseInt(currentRecalculationFlg)
          : parseInt(recalculationFlg),
      settlementFlg:
        currentSettlementFlg !== undefined
          ? parseInt(currentSettlementFlg)
          : parseInt(settlementFlg),
      page: commonPage,
      pageSize: commonPageSize,
    };
    try {
      setIsLoading(true);
      const result = await getCodeLookUps(filters);
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
        delete filters.pageSize;
        setSearchData(filters);
        setCodeLookUps(result.data.codeLookups);
        setSummaryResults(result.data.summaryResult);
        setCurrentPage(result.data.pagination.page);
        setTotalItems(result.data.pagination.total);
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

  const summaryResultExportCols: readonly ExportColumn<SummaryResults>[] = [
    {
      accessor: "total_betting_amount",
      header: t("cl_total_bet"),
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "total_valid_amount",
      header: t("cl_total_valid_bet"),
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "total_win_loss_amount",
      header: t("cl_total_win_lose"),
      format: (v) => (v ? Number(v) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
    {
      accessor: "total_rows",
      header: t("cl_total_order_count"),
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "total_commission",
      header: t("cl_total_commission"),
      format: (v) => (v ? parseFloat(Number(v).toFixed(3)) : 0),
    },
  ];

  const codeLookUpExportCols: readonly ExportColumn<CodeLookups>[] = [
    { accessor: "order_number", header: t("cl_bet_id") },
    { accessor: "account_number", header: t("cl_account_name") },
    { accessor: "real_name", header: t("cl_real_name") },
    {
      accessor: "desk_name",
      header: t("cl_table_number"),
      width: isEn ? 9 : 7,
    },
    { accessor: "bureau", header: t("cl_shoe_round"), width: isEn ? 13 : 13 },
    {
      accessor: "bet_name",
      header: t("cl_type"),
      width: isEn ? 9 : 9,
      format: (v, row) => {
        const betName = String(v || "");
        const deskName = row.desk_name;
        if (deskName === "G20") {
          const transformed = `${betName.charAt(2)}-${betName.substring(0, 2)}`;
          return transformed;
        }
        if (betName === "超6") {
          return "超级6";
        }
        return betName;
      },
      color: "FF008000",
    },
    {
      accessor: "betting_amount",
      header: t("cl_bet_amount"),
      width: isEn ? 10 : 10,
    },
    {
      accessor: "valid_amount",
      header: t("cl_valid_bet"),
      width: isEn ? 11 : 11,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "commission",
      header: t("cl_commission"),
      width: isEn ? 12 : 10,
      format: (v) => parseFloat(Number(v).toFixed(3)),
    },
    {
      accessor: "win_loss_amount",
      header: t("cl_win_lose_amount"),
      width: isEn ? 18 : 11,
      format: (v) => (v ? Number(v) : 0),
      color: (v) => (Number(v) < 0 ? "FFFF0000" : ""),
    },
    {
      accessor: "remaining_amount",
      header: t("cl_balance"),
      width: isEn ? 13 : 13,
      format: (v) => (v ? Number(v) : 0),
    },
    {
      accessor: "actual_round_results",
      header: t("cl_result"),
      format: (v, row) => {
        if (v == null) return "";
        let rawString = String(v);
        const deskName = row.desk_name;
        if (deskName === "G20") {
          rawString = rawString.replace(/翻倍|平倍/g, "");
        }
        rawString = rawString.replace(/超6/g, "超级6");
        let items = rawString
          .split(/\s*,\s*/)
          .filter((item) => item.length > 0);
        if (deskName === "G20") {
          items = [...new Set(items)];
        }
        return items.join(",");
      },
      color: "FFFF0000",
    },
    {
      accessor: "win_loss_result",
      header: t("cl_win_lose"),
      width: isEn ? 11 : 7,
      format: (_, row) =>
        !row.bet_state || row.win_loss_result == null
          ? ""
          : row.win_loss_result
            ? t("cl_win")
            : t("cl_lose"),
      color: (_, row) => {
        if (row.bet_state && !row.win_loss_result) {
          return "FFFF0000";
        }
        return "";
      },
    },
    {
      accessor: "betting_time",
      header: t("cl_bet_time"),
      format: (v) => formatLocalDateTime(String(v)),
    },
    {
      accessor: "payment_time",
      header: t("cl_payout_time"),
      format: (v, row) => formatLocalDateTime(String(v ?? row.betting_time)),
    },
    { accessor: "ip_address", header: t("cl_ip"), width: isEn ? 13 : 13 },
    {
      accessor: "bet_state",
      header: t("cl_settlement"),
      width: isEn ? 11 : 9,
      format: (_, row) =>
        row.cancel_flg
          ? t("cl_cancelled")
          : row.bet_state
            ? t("cl_settled")
            : t("cl_unsettled"),
    },
  ];

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await getCodeLookUps(searchData);
      const tables: ExportTable<object>[] = [
        {
          title: t("cl_summary_sheet"),
          columns: summaryResultExportCols as readonly ExportColumn<object>[],
          data: result.data.summaryResult,
        },
        {
          title: t("cl_detail_sheet"),
          columns: codeLookUpExportCols as readonly ExportColumn<object>[],
          data: result.data.codeLookups,
        },
      ];
      await exportExcel(
        {
          fileName: `${t("code_lookup")}_${new Date().getTime()}`,
          startDate,
          endDate,
          lang: i18n.language,
          fileType: "xlsx",
          mode: "multi",
          gridFlg: true,
        },
        tables,
      );
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };

  const columns: ColumnDef<CodeLookups>[] = [
    { accessorKey: "order_number", header: t("cl_bet_id"), size: 100 },
    { accessorKey: "account_number", header: t("cl_account_name") },
    { accessorKey: "real_name", header: t("cl_real_name") },
    { accessorKey: "desk_name", header: t("cl_table_number"), size: 30 },
    { accessorKey: "bureau", header: t("cl_shoe_round"), size: 100 },
    {
      accessorKey: "bet_name",
      header: t("cl_type"),
      size: 100,
      cell: ({ row, getValue }) => {
        const betName = String(getValue() || "");
        const deskName = row.original.desk_name;
        if (deskName === "G20") {
          const transformed = `${betName.charAt(2)}-${betName.substring(0, 2)}`;
          return <span className="text-emerald-500">{transformed}</span>;
        }
        if (betName === "超6") {
          return <span className="text-emerald-500">超级6</span>;
        }
        return <span className="text-emerald-500">{betName}</span>;
      },
    },
    { accessorKey: "betting_amount", header: t("cl_bet_amount"), size: 100 },
    {
      accessorKey: "valid_amount",
      header: t("cl_valid_bet"),
      size: 100,
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{data ? data : 0}</span>;
      },
    },
    {
      accessorKey: "commission",
      header: t("cl_commission"),
      size: 100,
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
    {
      accessorKey: "win_loss_amount",
      header: t("cl_win_lose_amount"),
      size: 100,
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
      accessorKey: "remaining_amount",
      header: t("cl_balance"),
      size: 100,
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{data ? data : 0}</span>;
      },
    },
    {
      accessorKey: "actual_round_results",
      header: t("cl_result"),
      size: 100,
      cell: ({ row, getValue }) => {
        if (getValue() == null) return "";
        let rawString = String(getValue());
        const deskName = row.original.desk_name;
        if (deskName === "G20") {
          rawString = rawString.replace(/翻倍|平倍/g, "");
        }
        rawString = rawString.replace(/超6/g, "超级6");
        let items = rawString
          .split(/\s*,\s*/)
          .filter((item) => item.length > 0);
        if (deskName === "G20") {
          items = [...new Set(items)];
        }
        const formattedElements = items.map((item, index) => {
          const isLastItem = index === items.length - 1;
          const isEndOfPair = (index + 1) % 2 === 0;
          const itemText = isLastItem ? item : `${item},`;
          if (isEndOfPair && !isLastItem) {
            return (
              <React.Fragment key={index}>
                {itemText}
                <br />
              </React.Fragment>
            );
          }
          return <React.Fragment key={index}>{itemText}</React.Fragment>;
        });

        return <span className="text-red-500">{formattedElements}</span>;
      },
    },
    {
      accessorKey: "win_loss_result",
      header: t("cl_win_lose"),
      size: 30,
      cell: ({ row }) => {
        const settle_flg = row.original.bet_state;
        return (
          <span className={!row.original.win_loss_result ? "text-red-500" : ""}>
            {!settle_flg || row.original.win_loss_result === null
              ? ""
              : row.original.win_loss_result
                ? t("cl_win")
                : t("cl_lose")}
          </span>
        );
      },
    },
    {
      accessorKey: "betting_time",
      header: t("cl_bet_time"),
      size: 80,
      cell: ({ getValue }) => {
        const rawString = String(getValue());
        const parts = formatLocalDateTime(rawString).split(" ");
        if (parts.length < 2) {
          return <span>{rawString}</span>;
        }
        const datePart = parts[0];
        const timePart = parts[1].split(".")[0];

        return (
          <span>
            {datePart}
            <br />
            {timePart}
          </span>
        );
      },
    },
    {
      accessorKey: "payment_time",
      header: t("cl_payout_time"),
      size: 80,
      cell: ({ row }) => {
        const payment_time = row.original.payment_time;
        const betting_time = row.original.betting_time;
        const rawString =
          payment_time == null ? String(betting_time) : String(payment_time);
        const parts = formatLocalDateTime(rawString).split(" ");
        if (parts.length < 2) {
          return <span>{rawString}</span>;
        }
        const datePart = parts[0];
        const timePart = parts[1].split(".")[0];

        return (
          <span>
            {datePart}
            <br />
            {timePart}
          </span>
        );
      },
    },
    { accessorKey: "ip_address", header: t("cl_ip"), size: 100 },
    {
      accessorKey: "bet_state",
      header: t("cl_settlement"),
      size: 70,
      cell: ({ row }) => {
        const cancel_flg = row.original.cancel_flg;
        const betState = row.original.bet_state;
        const stateText = cancel_flg
          ? t("cl_cancelled")
          : betState
            ? t("cl_settled")
            : t("cl_unsettled");

        return <span>{stateText}</span>;
      },
    },
  ];

  const columnSummary: ColumnDef<SummaryResults>[] = [
    { accessorKey: "total_betting_amount", header: t("cl_total_bet") },
    { accessorKey: "total_valid_amount", header: t("cl_total_valid_bet") },
    {
      accessorKey: "total_win_loss_amount",
      header: t("cl_total_win_lose"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return (
          <span className={data < 0 ? "text-red-500" : ""}>
            {data ? data : 0}
          </span>
        );
      },
    },
    { accessorKey: "total_rows", header: t("cl_total_order_count") },
    {
      accessorKey: "total_commission",
      header: t("cl_total_commission"),
      cell: ({ getValue }) => {
        const data = getValue() as number;
        return <span>{parseFloat(Number(data).toFixed(3)).toString()}</span>;
      },
    },
  ];

  return (
    <>
      <div className="w-full">
        <CommonSearchPanel
          key={searchKey}
          onSearch={handleSearch}
          onExport={handleExport}
          initFlg={true}
          commonPage={currentPage}
          commonPageSize={pageSize}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 lg:gap-x-14 gap-y-2">
            <InputField
              id="customerAccountInput"
              label={t("cl_account")}
              value={customerAccount}
              required={false}
              labelWidth={dynamicLabelWidth}
              labelClassName="text-start lg:text-end"
              horizontal={true}
              inputWidth="w-full max-w-md"
              onChange={(e) => {
                setCustomerAccount(e.target.value);
              }}
            />
            <InputField
              id="shoeSizeInput"
              label={t("cl_boot_no")}
              value={shoeSize}
              required={false}
              labelWidth={dynamicLabelWidth}
              labelClassName="text-start lg:text-end"
              inputWidth="w-full max-w-md"
              onChange={(e) => {
                setShoeSize(e.target.value);
              }}
            />
            <InputField
              id="numberOfMouthsInput"
              label={t("cl_round_no")}
              value={numberOfMouths}
              required={false}
              labelWidth={dynamicLabelWidth}
              labelClassName="text-start lg:text-end"
              inputWidth="w-full max-w-md"
              onChange={(e) => {
                setNumberOfMouths(e.target.value);
              }}
            />
            <SelectField
              id="game_id"
              label={t("cl_game_type")}
              required={false}
              value={gameType}
              labelWidth={dynamicLabelWidth}
              labelClassName="text-start lg:text-end"
              selectClassName="w-full max-w-md"
              autoSelectFirst={true}
              onChange={(newValue) => setGameType(newValue)}
              options={games.map((d) => ({
                value: String(d.id),
                label:
                  d.type === "NIUNIU"
                    ? t("cl_niuniu")
                    : d.type === "BACCARAT"
                      ? t("cl_baccarat")
                      : d.type === "LONGHU"
                        ? t("cl_dragon_tiger")
                        : d.name,
              }))}
              selectWidth="w-full"
            />
            <SelectField
              id="desk_id"
              label={t("cl_table_no")}
              required={false}
              value={deskNo}
              labelWidth={dynamicLabelWidth}
              labelClassName="text-start lg:text-end"
              selectClassName="w-full max-w-md"
              autoSelectFirst={true}
              onChange={(newValue) => setDeskNo(newValue)}
              options={desks.map((d) => ({
                value: String(d.id),
                label: d.name,
              }))}
              selectWidth="w-full"
            />
            <SelectField
              id="cancel_flg"
              label={t("cl_cancel")}
              required={false}
              value={cancelFlg}
              labelWidth={dynamicLabelWidth}
              labelClassName="text-start lg:text-end"
              selectClassName="w-full max-w-md"
              autoSelectFirst={true}
              onChange={(newValue) => setCancelFlg(newValue)}
              options={cancels.map((d) => ({
                value: String(d.id),
                label: d.name,
              }))}
              selectWidth="w-full"
            />
            <SelectField
              id="recalculation_flg"
              label={t("cl_recalculate")}
              required={false}
              value={recalculationFlg}
              labelWidth={dynamicLabelWidth}
              labelClassName="text-start lg:text-end"
              selectClassName="w-full max-w-md"
              autoSelectFirst={true}
              onChange={(newValue) => setRecalculationFlg(newValue)}
              options={recalculations.map((d) => ({
                value: String(d.id),
                label: d.name,
              }))}
              selectWidth="w-full"
            />
            <SelectField
              id="settlement_flg"
              label={t("cl_settlement")}
              required={false}
              value={settlementFlg}
              labelWidth={dynamicLabelWidth}
              labelClassName="text-start lg:text-end"
              selectClassName="w-full max-w-md"
              autoSelectFirst={true}
              onChange={(newValue) => setSettlementFlg(newValue)}
              options={settlements.map((d) => ({
                value: String(d.id),
                label: d.name,
              }))}
              selectWidth="w-full"
            />
          </div>
        </CommonSearchPanel>
        <div className="mt-2 w-full overflow-x-auto">
          <div className="min-w-full">
            <DataTable columns={columnSummary} data={summaryResults} />
          </div>
        </div>
        <div className="mt-2 w-full overflow-x-auto mb-1">
          <DataTable columns={columns} data={codeLookups} />
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
        onClose={() => {
          setErrorDialogOpen(false);
          setCustomerAccount("");
          setShoeSize("");
          setNumberOfMouths("");
          setGameType("");
          setDeskNo("");
          setCancelFlg("");
          setRecalculationFlg("");
          setSettlementFlg("");
          handleReload();
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};

export default CodeLookup;
