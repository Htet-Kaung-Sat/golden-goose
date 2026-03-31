import { getUsers } from "@/api/admin/user";
import AgentTree from "@/components/shared/AgentTree";
import BasePagination from "@/components/shared/BasePagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { useLoading } from "@/contexts/useLoading";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { User } from "@/types/User";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { ExportColumn, exportExcel, ExportTable } from "@/utils/exportExcelJs";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/**
 * Agent tab: search agents by upper account, paginated table with action dropdown and export.
 */
const Agent = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [upperUserAccount, setUpperUserAccount] = useState(loginUser?.account);
  const [agentUsers, setAgentUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [actionSelectedMap, setActionSelectedMap] = useState<
    Record<number, string>
  >({});
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { actions, setIsLoading } = useLoading();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  /** Changes page and refetches agents. */
  const handlePageChange = async (page: number) => {
    if (currentPage !== page) {
      setCurrentPage(page);
      await handleAgentSearch(String(upperUserAccount), page, pageSize);
    }
  };

  /** Changes page size and refetches from first page. */
  const handleLimitChange = async (limit: number) => {
    if (limit !== pageSize) {
      setPageSize(limit);
      setCurrentPage(1);
      await handleAgentSearch(String(upperUserAccount), 1, limit);
    }
  };

  /** Fetches agents by creator_account with pagination and totalBalance. */
  const handleAgentSearch = async (
    account: string,
    commonPage?: number | undefined,
    commonPageSize?: number | undefined,
  ) => {
    try {
      const res = await getUsers({
        page: commonPage,
        limit: commonPageSize,
        creator_account: account ? account : loginUser?.account,
        role_name: "agent",
        totalBalance: true,
        order: "id:DESC",
      });
      setAgentUsers(res.data.users);
      setUpperUserAccount(account);
      setTotalItems(res.data.pagination.total);
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };

  /** Exports agent list to Excel. */
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await getUsers({ account: upperUserAccount });
      const upperUser = result.data.users;
      const res = await getUsers({
        creator_account: upperUserAccount,
        role_name: "agent",
        totalBalance: true,
        order: "id:DESC",
      });
      const fetchedUsers = res.data.users;
      const tables: ExportTable<object>[] = [
        {
          columns: upperAgentCols as readonly ExportColumn<object>[],
          data: upperUser,
        },
        {
          columns: agentExportCols as readonly ExportColumn<object>[],
          data: fetchedUsers,
        },
      ];
      const now = new Date();
      const startDate = formatLocalDateTime(String(now));
      exportExcel(
        {
          fileName: `${t("agent")}_${new Date().getTime()}`,
          startDate,
          endDate: "",
          lang: lang,
          fileType: "xls",
          gridFlg: false,
          mode: "single",
        },
        tables,
      );
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };

  const upperAgentCols: readonly ExportColumn<User>[] = [
    { accessor: "account", header: t("a_account") },
    { accessor: "name", header: t("a_name"), width: lang === "en" ? 20 : 15 },
    {
      accessor: "balance",
      header: t("a_balance"),
      width: lang === "en" ? 25 : 21,
    },
    {
      accessor: "bonus_rate",
      header: t("a_bonus_ratio"),
      width: lang === "en" ? 13 : 10,
      format: (value: unknown) => (value ? Number(value) / 100 : 0),
      numFmt: "0.00%",
    },
    {
      accessor: "share_rate",
      header: t("a_share"),
      width: lang === "en" ? 13 : 10,
      format: (value: unknown) => (value ? Number(value) / 100 : 0),
      numFmt: "0%",
    },
  ];

  const agentExportCols: readonly ExportColumn<User>[] = [
    { accessor: "id", header: "ID" },
    {
      accessor: "account",
      header: t("a_account"),
      width: lang === "en" ? 20 : 15,
    },
    { accessor: "name", header: t("a_name"), width: lang === "en" ? 25 : 21 },
    {
      accessor: "share_rate",
      header: t("a_share"),
      width: lang === "en" ? 13 : 10,
      format: (value: unknown) => (value ? Number(value) / 100 : 0),
      numFmt: "0%",
    },
    {
      accessor: "balance",
      header: t("a_balance"),
      width: lang === "en" ? 13 : 10,
    },
    {
      accessor: "total_balance",
      header: t("a_total_balance"),
      format: (value: unknown) => {
        return Number(value ?? 0);
      },
      width: lang === "en" ? 13 : 10,
    },
    {
      accessor: "bonus_rate",
      header: t("a_bonus_ratio"),
      width: lang === "en" ? 15 : 10,
      format: (value: unknown, row: User) => {
        const bonusType = row.bonus_type;
        const rate = Number(value ?? 0);
        if (bonusType === "single") return t("a_bonus_one") + rate + "%";
        if (bonusType === "both") return t("a_bonus_two") + rate + "%";
        return "0%";
      },
    },
    {
      accessor: "state",
      header: t("a_state"),
      width: lang === "en" ? 12 : 8,
      format: (value: unknown, row: User) => {
        const stateValue = value;
        const lockingValue = row.locking;
        if (stateValue === "suspension") {
          return t("common_suspension");
        } else if (stateValue === "freeze") {
          return t("common_freeze");
        } else if (lockingValue === "locking") {
          return t("common_locking");
        } else {
          return t("common_normal");
        }
      },
    },
  ];

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "account",
      header: t("a_account"),
    },
    {
      accessorKey: "name",
      header: t("a_name"),
    },
    {
      accessorKey: "share",
      header: t("a_share"),
      cell: ({ row }) => {
        const shareType = row.original.share_type;
        if (shareType) {
          return <p>{row.original.share_rate + "%"}</p>;
        } else {
          return <p>0%</p>;
        }
      },
    },
    {
      accessorKey: "balance",
      header: t("a_balance"),
    },
    {
      accessorKey: "total_balance",
      header: t("a_total_balance"),
    },
    {
      accessorKey: "bonus",
      header: t("a_bonus_ratio"),
      cell: ({ row }) => {
        const bonusType = row.original.bonus_type;
        if (bonusType === "single") {
          return (
            <p>
              {t("a_bonus_one") +
                parseFloat(String(row.original.bonus_rate)) +
                "%"}
            </p>
          );
        } else if (bonusType === "both") {
          return (
            <p>
              {t("a_bonus_two") +
                parseFloat(String(row.original.bonus_rate)) +
                "%"}
            </p>
          );
        }
      },
    },
    {
      accessorKey: "state",
      header: t("a_state"),
      cell: ({ row }) => {
        const stateValue = row.original.state;
        const lockingValue = row.original.locking;
        if (stateValue === "suspension") {
          return (
            <p className="font-red font-medium">{t("common_suspension")}</p>
          );
        } else if (stateValue === "freeze") {
          return <p className="font-red font-medium">{t("common_freeze")}</p>;
        } else if (lockingValue === "locking") {
          return <p className="font-red font-medium">{t("common_locking")}</p>;
        } else {
          return <p className="font-green font-medium">{t("common_normal")}</p>;
        }
      },
    },
    {
      id: "actions",
      header: t("common_operation"),
      cell: ({ row }) => {
        const handleActionChange = (newValue: string) => {
          switch (newValue) {
            case "user_topup":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(`/admin/user_management/agent/${row.original.id}/topup`);
              break;
            case "user_modify_status":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/agent/${row.original.id}/modify_status`,
              );
              break;
            case "user_change_password":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/agent/${row.original.id}/change_password`,
              );
              break;
            case "bet_limit_config":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/agent/${row.original.id}/bet_limit_config`,
              );
              break;
            case "auto_settle_wash_code":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/agent/${row.original.id}/auto_settle_wash_code`,
              );
              break;
            case "auto_settle_rebate":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/agent/${row.original.id}/auto_settle_rebate`,
              );
              break;
            case "user_change_name":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/agent/${row.original.id}/change_name`,
              );
              break;
            case "update_info":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/agent/${row.original.id}/update_info`,
              );
              break;
            default:
              break;
          }
        };
        return (
          <SelectField
            id={`agent-${row.original.id}`}
            value={actionSelectedMap[row.original.id ?? 0] || ""}
            onChange={(newValue) => {
              setActionSelectedMap((prev) => ({
                ...prev,
                [row.original.id ?? 0]: newValue,
              }));
              handleActionChange(newValue);
            }}
            options={actions.map((d) => ({
              value: String(d.id),
              label: d.name ?? "",
            }))}
            required={false}
            selectClassName=""
            placeholder={t("common_operation")}
          />
        );
      },
    },
  ];

  return (
    <div className="relative mt-3">
      <Button variant="info" onClick={() => handleExport()}>
        {t("common_export")}
      </Button>
      <div className="overflow-x-auto mt-1 mb-1">
        <DataTable columns={columns} data={agentUsers} />
      </div>
      <BasePagination
        currentPage={currentPage}
        totalItems={totalItems}
        initialLimit={pageSize}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />
      <AgentTree
        onSearch={handleAgentSearch}
        commonPage={currentPage}
        commonPageSize={pageSize}
      />
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        status="fail"
        message={errorMessage ?? ""}
      />
    </div>
  );
};

export default Agent;
