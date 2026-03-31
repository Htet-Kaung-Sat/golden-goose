import { getUsers } from "@/api/admin/user";
import BasePagination from "@/components/shared/BasePagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { User } from "@/types/User";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { ColumnDef } from "@tanstack/react-table";
import { AxiosError } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
type PayloadValues = User & {
  page: number;
  limit: number;
  totalBalance: boolean;
  include: string;
  role_name: string;
  order: string;
  allHierarchy?: boolean;
  user_search?: boolean;
};

/**
 * User search: search members/agents by account or creator, paginated table with action dropdown.
 */
const UserSearch = () => {
  const [account, setAccount] = useState<string>("");
  const [creatorAccount, setCreatorAccount] = useState<string>("");
  const [noData, setNoData] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
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
  const didFetch = useRef(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  /** Fetches users (member/agent) by account/creator with pagination and totalBalance. */
  const fetchUser = useCallback(
    async (
      childAccount: string | null,
      parentAccount: string | null,
      page: number,
      limit: number,
    ) => {
      try {
        setIsLoading(true);
        const payload: PayloadValues = {
          page: page,
          limit: limit,
          totalBalance: true,
          include: "role",
          role_name: "member,agent",
          order: "id:DESC",
        };
        if (!(childAccount || parentAccount)) {
          payload.allHierarchy = true;
        } else {
          payload.user_search = true;
          if (childAccount) {
            payload.account = childAccount;
          }
          if (parentAccount) {
            payload.creator_account = parentAccount;
          }
        }
        const res = await getUsers(payload);
        setUsers(res.data.users);
        setTotalItems(res.data.pagination.total);
        setIsLoading(false);
      } catch (error) {
        if (error instanceof AxiosError && error.response?.data) {
          const data = error.response.data as Record<string, unknown>;
          const msg = String(data?.message ?? "");
          if (msg === "查无资料") {
            setNoData(true);
          }
          const displayMessage =
            msg === "查无资料" ? t("no_data") : msg || String(error);
          setErrorFromResponse(displayMessage);
        } else {
          setErrorFromResponse(error);
        }
        setIsLoading(false);
      }
    },
    [t, setErrorFromResponse, setIsLoading],
  );

  useEffect(() => {
    if (!didFetch.current) {
      fetchUser(account, creatorAccount, currentPage, pageSize);
      didFetch.current = true;
    }
  }, [account, creatorAccount, currentPage, pageSize, fetchUser]);

  /** Changes page and refetches users. */
  const handlePageChange = async (page: number) => {
    if (currentPage !== page) {
      setCurrentPage(page);
      await fetchUser(account, creatorAccount, page, pageSize);
    }
  };

  /** Changes page size and refetches from first page. */
  const handleLimitChange = async (limit: number) => {
    if (limit !== pageSize) {
      setPageSize(limit);
      setCurrentPage(1);
      await fetchUser(account, creatorAccount, 1, limit);
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "id",
      header: t("us_id"),
      size: 100,
    },
    {
      accessorKey: "role.chinese_name",
      header: t("us_role"),
      size: 100,
      cell: ({ getValue }) => {
        const data = String(getValue() || "");
        return data === "会员"
          ? t("member")
          : data === "代理"
            ? t("agent")
            : "";
      },
    },
    {
      accessorKey: "account",
      header: t("us_account"),
    },
    {
      accessorKey: "name",
      header: t("us_nickname"),
      cell: ({ row }) => {
        const data = row.original.name;
        return data === null || "" ? " - " : data;
      },
    },
    {
      accessorKey: "creator_account",
      header: t("us_parent_account"),
      cell: ({ row }) => {
        const data = row.original.creator_account;
        return data === undefined || "" ? (
          " - "
        ) : (
          <Button
            variant="outline"
            type="button"
            size="sm"
            onClick={() => {
              setCreatorAccount(data);
              fetchUser(account, data, currentPage, pageSize);
            }}
          >
            {data}
          </Button>
        );
      },
    },
    {
      accessorKey: "state",
      header: t("us_state"),
      size: 50,
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
      accessorKey: "balance",
      header: t("us_balance"),
      size: 100,
    },
    {
      accessorKey: "total_balance",
      header: t("us_total_balance"),
      size: 100,
    },
    {
      accessorKey: "bonus",
      header: t("us_bonus_ratio"),
      size: 80,
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
      accessorKey: "share",
      header: t("us_share"),
      size: 50,
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
      accessorKey: "createdAt",
      header: t("us_created_at"),
      size: 100,
      cell: ({ row }) => {
        const created = row.original.createdAt;
        const rawString = String(created);
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
      accessorKey: "updatedAt",
      header: t("us_updated_at"),
      size: 100,
      cell: ({ row }) => {
        const updated = row.original.updatedAt;
        const rawString = String(updated);
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
      id: "actions",
      header: t("common_operation"),
      size: 150,
      cell: ({ row }) => {
        const handleActionChange = (newValue: string) => {
          switch (newValue) {
            case "user_topup":
              navigate(
                `/admin/user_search/${row.original.role?.name}/${row.original.id}/topup`,
              );
              break;
            case "user_modify_status":
              navigate(
                `/admin/user_search/${row.original.role?.name}/${row.original.id}/modify_status`,
              );
              break;
            case "user_change_password":
              navigate(
                `/admin/user_search/${row.original.role?.name}/${row.original.id}/change_password`,
              );
              break;
            case "bet_limit_config":
              navigate(
                `/admin/user_search/${row.original.role?.name}/${row.original.id}/bet_limit_config`,
              );
              break;
            case "auto_settle_wash_code":
              navigate(
                `/admin/user_search/${row.original.role?.name}/${row.original.id}/auto_settle_wash_code`,
              );
              break;
            case "auto_settle_rebate":
              navigate(
                `/admin/user_search/${row.original.role?.name}/${row.original.id}/auto_settle_rebate`,
              );
              break;
            case "user_change_name":
              navigate(
                `/admin/user_search/${row.original.role?.name}/${row.original.id}/change_name`,
              );
              break;
            case "update_info":
              navigate(
                `/admin/user_search/${row.original.role?.name}/${row.original.id}/update_info`,
              );
              break;
            default:
              break;
          }
        };
        return (
          <div>
            <Button
              variant="info"
              type="button"
              size="sm"
              className={
                row.original.role?.name === "member" ? "hidden " : "block mb-1"
              }
              onClick={() => {
                setCreatorAccount(String(row.original.account));
                fetchUser(
                  account,
                  String(row.original.account),
                  currentPage,
                  pageSize,
                );
              }}
            >
              {t("us_view_subordinates")}
            </Button>
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
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex lg:flex-row flex-col gap-3 mb-4">
        <div>
          <InputField
            id="account"
            label={t("us_account")}
            labelWidth={isEn ? "md:w-31 lg:w-15" : "md:w-17 "}
            required={false}
            type="text"
            value={account}
            onChange={(e) => {
              setAccount(e.target.value);
            }}
            inputClassName="w-60"
          />
        </div>
        <div>
          <InputField
            id="creator_account"
            label={t("us_parent_account")}
            labelWidth={isEn ? "md:w-31" : "md:w-17 "}
            required={false}
            type="text"
            value={creatorAccount}
            onChange={(e) => {
              setCreatorAccount(e.target.value);
            }}
            inputClassName="w-60"
          />
        </div>
      </div>
      <div>
        <Button
          variant="info"
          type="button"
          onClick={() =>
            fetchUser(account, creatorAccount, currentPage, pageSize)
          }
        >
          {t("common_search")}
        </Button>
      </div>
      <DataTable columns={columns} data={users} title={t("us_title")} />
      <BasePagination
        currentPage={currentPage}
        totalItems={totalItems}
        initialLimit={pageSize}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
          if (noData) {
            setNoData(false);
            setAccount("");
            setCreatorAccount("");
            fetchUser("", "", currentPage, pageSize);
          }
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
    </div>
  );
};

export default UserSearch;
