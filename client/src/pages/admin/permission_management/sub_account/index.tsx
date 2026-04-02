import { getUsers } from "@/api/admin/user";
import BasePagination from "@/components/shared/BasePagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { User } from "@/types/User";
import { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/**
 * Sub-account list page: paginated table of sub-accounts with edit navigation.
 */
const SubAccount = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser: User | null = stored ? JSON.parse(stored) : null;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [subAccounts, setSubAccounts] = useState<User[]>([]);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const navigate = useNavigate();
  const didFetch = useRef(false);
  const { t } = useTranslation();

  /** Fetches sub-accounts for current creator with pagination. */
  const fetchSubAccounts = useCallback(
    async (page: number, limit: number) => {
      try {
        setIsLoading(true);
        const result = await getUsers({
          creator_account: loginUser?.login_account,
          role_name: "sub_account",
          page,
          limit,
        });
        setSubAccounts(result.data.users);
        setTotalItems(result.data.pagination.total);
        setIsLoading(false);
      } catch (error) {
        setErrorFromResponse(error);
        setIsLoading(false);
      }
    },
    [loginUser?.login_account, setErrorFromResponse, setIsLoading],
  );

  useEffect(() => {
    if (!didFetch.current) {
      fetchSubAccounts(currentPage, pageSize);
      didFetch.current = true;
    }
  }, [currentPage, pageSize, fetchSubAccounts]);

  /** Changes current page and refetches sub-accounts. */
  const handlePageChange = async (page: number) => {
    if (currentPage !== page) {
      setCurrentPage(page);
      await fetchSubAccounts(page, pageSize);
    }
  };

  /** Changes page size and refetches from first page. */
  const handleLimitChange = async (limit: number) => {
    if (limit !== pageSize) {
      setPageSize(limit);
      setCurrentPage(1);
      await fetchSubAccounts(1, limit);
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "account",
      header: t("sa_account"),
    },
    {
      accessorKey: "name",
      header: t("sa_name"),
    },
    {
      accessorKey: "day_limit",
      header: t("sa_day"),
    },
    {
      accessorKey: "state",
      header: t("sa_state"),
      cell: ({ row }) => {
        const isOnline = row.original.state == "online" ? true : false;
        return isOnline ? (
          <p className="text-emerald-500 font-medium">{t("saf_online")}</p>
        ) : (
          <p className="text-red-500 font-medium">{t("saf_offline")}</p>
        );
      },
    },
    {
      id: "actions",
      header: t("sa_operate"),
      cell: ({ row }) => (
        <button
          onClick={() =>
            navigate(`/admin/sub_account/${row.original.id}/sub_account_edit`)
          }
          className="p-1 bg-blue-700 text-white rounded hover:bg-blue-600"
        >
          <Pencil size={18} />
        </button>
      ),
    },
  ];
  return (
    <>
      <Button
        variant="info"
        className="mb-1"
        onClick={() => navigate("sub_account_create")}
      >
        {t("sa_add")}
      </Button>
      <DataTable
        columns={columns}
        data={subAccounts}
        title={t("sub_account")}
      />
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
        onClose={() => setErrorDialogOpen(false)}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};

export default SubAccount;
