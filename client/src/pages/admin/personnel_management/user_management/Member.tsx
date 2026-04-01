import { getUsers } from "@/api/admin/user";
import AgentTree from "@/components/shared/AgentTree";
import BasePagination from "@/components/shared/BasePagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { User } from "@/types/User";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { ExportColumn, exportExcel, ExportTable } from "@/utils/exportExcelJs";
import { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/**
 * Member tab: search members by upper account, paginated table with action dropdown and export.
 */
const MemberPage = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [upperUserAccount, setUpperUserAccount] = useState(loginUser?.account);
  const [members, setMembers] = useState<User[]>([]);
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

  /** Changes page and refetches members. */
  const handlePageChange = async (page: number) => {
    if (currentPage !== page) {
      setCurrentPage(page);
      await handleMemberSearch(String(upperUserAccount), page, pageSize);
    }
  };

  /** Changes page size and refetches from first page. */
  const handleLimitChange = async (limit: number) => {
    if (limit !== pageSize) {
      setPageSize(limit);
      setCurrentPage(1);
      await handleMemberSearch(String(upperUserAccount), 1, limit);
    }
  };

  /** Fetches members by creator_account with pagination. */
  const handleMemberSearch = async (
    account: string,
    commonPage?: number | undefined,
    commonPageSize?: number | undefined,
  ) => {
    try {
      const res = await getUsers({
        page: commonPage,
        limit: commonPageSize,
        creator_account: account ? account : loginUser?.account,
        role_name: "member",
        order: "id:DESC",
      });
      setMembers(res.data.users);
      setUpperUserAccount(account);
      setTotalItems(res.data.pagination.total);
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };

  /** Exports member list to Excel. */
  const handleExport = async () => {
    setIsLoading(true);
    try {
      const result = await getUsers({ account: upperUserAccount });
      const upperUser = result.data.users;
      const res = await getUsers({
        creator_account: upperUserAccount,
        role_name: "member",
        order: "id:DESC",
      });
      const fetchedUsers = res.data.users;
      const tables: ExportTable<object>[] = [
        {
          columns: upperAgentCols as readonly ExportColumn<object>[],
          data: upperUser,
        },
        {
          columns: memberCols as readonly ExportColumn<object>[],
          data: fetchedUsers,
        },
      ];
      const now = new Date();
      const startDate = formatLocalDateTime(String(now));
      exportExcel(
        {
          fileName: `${t("member")}_${new Date().getTime()}`,
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

  const memberCols: readonly ExportColumn<User>[] = [
    { accessor: "id", header: "ID" },
    {
      accessor: "account",
      header: t("m_account"),
      width: lang === "en" ? 20 : 15,
    },
    { accessor: "name", header: t("m_name"), width: lang === "en" ? 25 : 21 },
    {
      accessor: "share_rate",
      header: t("a_share"),
      width: lang === "en" ? 13 : 10,
      format: (value: unknown) => (value ? Number(value) / 100 : 0),
      numFmt: "0%",
    },
    {
      accessor: "balance",
      header: t("m_balance"),
      width: lang === "en" ? 13 : 10,
    },
    {
      accessor: "balance",
      header: t("a_total_balance"),
      width: lang === "en" ? 13 : 10,
    },
    {
      accessor: "bonus_rate",
      header: t("m_bonus_ratio"),
      width: lang === "en" ? 15 : 10,
      format: (value: unknown, row: User) => {
        const bonusType = row.bonus_type;
        const rate = Number(value ?? 0);
        if (bonusType === "single") return t("m_bonus_one") + rate + "%";
        if (bonusType === "both") return t("m_bonus_two") + rate + "%";
        return "0%";
      },
    },
    {
      accessor: "state",
      header: t("m_state"),
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
      header: t("m_account"),
    },
    {
      accessorKey: "name",
      header: t("m_name"),
    },
    {
      accessorKey: "balance",
      header: t("m_balance"),
    },
    {
      accessorKey: "bonus",
      header: t("m_bonus_ratio"),
      cell: ({ row }) => {
        const bonusType = row.original.bonus_type;
        if (bonusType === "single") {
          return (
            <p>
              {t("m_bonus_one") +
                parseFloat(String(row.original.bonus_rate)) +
                "%"}
            </p>
          );
        } else if (bonusType === "both") {
          return (
            <p>
              {t("m_bonus_two") +
                parseFloat(String(row.original.bonus_rate)) +
                "%"}
            </p>
          );
        }
      },
    },
    {
      accessorKey: "display_bonus",
      header: t("m_display_bonus"),
      cell: ({ row }) =>
        row.original.display_bonus ? t("m_show") : t("m_hide"),
    },
    {
      accessorKey: "state",
      header: t("m_state"),
      cell: ({ row }) => {
        const stateValue = row.original.state;
        const lockingValue = row.original.locking;
        if (stateValue === "suspension") {
          return (
            <p className="text-red-500 font-medium">{t("common_suspension")}</p>
          );
        } else if (stateValue === "freeze") {
          return (
            <p className="text-red-500 font-medium">{t("common_freeze")}</p>
          );
        } else if (lockingValue === "locking") {
          return (
            <p className="text-red-500 font-medium">{t("common_locking")}</p>
          );
        } else {
          return (
            <p className="text-emerald-500 font-medium">{t("common_normal")}</p>
          );
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
              navigate(
                `/admin/user_management/member/${row.original.id}/topup`,
              );
              break;
            case "user_modify_status":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/member/${row.original.id}/modify_status`,
              );
              break;
            case "user_change_password":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/member/${row.original.id}/change_password`,
              );
              break;
            case "bet_limit_config":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/member/${row.original.id}/bet_limit_config`,
              );
              break;
            case "auto_settle_wash_code":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/member/${row.original.id}/auto_settle_wash_code`,
              );
              break;
            case "auto_settle_rebate":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/member/${row.original.id}/auto_settle_rebate`,
              );
              break;
            case "user_change_name":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/member/${row.original.id}/change_name`,
              );
              break;
            case "update_info":
              localStorage.setItem(
                "upperUserAccount",
                String(upperUserAccount),
              );
              navigate(
                `/admin/user_management/member/${row.original.id}/update_info`,
              );
              break;
            default:
              break;
          }
        };
        return (
          <SelectField
            id={`actions-${row.original.id}`}
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
    <div className="relative min-h-[400px] mt-3">
      <Button variant="info" onClick={() => handleExport()}>
        {t("common_export")}
      </Button>
      <div className="overflow-x-auto mt-1 mb-1">
        <DataTable columns={columns} data={members} />
      </div>
      <BasePagination
        currentPage={currentPage}
        totalItems={totalItems}
        initialLimit={pageSize}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />
      <AgentTree
        onSearch={handleMemberSearch}
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

export default MemberPage;
