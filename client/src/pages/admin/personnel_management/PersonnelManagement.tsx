import { getRoles } from "@/api/admin/role";
import { getUsers } from "@/api/admin/user";
import BasePagination from "@/components/shared/BasePagination";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { Role } from "@/types/Role";
import { User } from "@/types/User";
import { ColumnDef } from "@tanstack/react-table";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Personnel management: search agents/members by account/name, state, role; paginated table with action links.
 */
const PersonnelManagement = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [nameAccount, setNameAccount] = useState<string>("account");
  const [name, setName] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const didFetch = useRef(false);
  const { t } = useTranslation();
  const nameAccounts = [
    { id: "account", name: t("pm_account") },
    { id: "name", name: t("pm_name") },
  ];
  const stateData = [
    { id: "all", name: t("common_all") },
    { id: "normal", name: t("common_normal") },
    { id: "suspension", name: t("common_suspension") },
  ];

  /** Fetches users by name/account, state, role with pagination. */
  const handleSearch = useCallback(
    async (
      page: number,
      limit: number,
      currentName?: string,
      currentState?: string,
      currentRole?: string,
    ) => {
      setIsLoading(true);
      try {
        const res = await getUsers({
          page: page,
          limit: limit,
          nameAccount: nameAccount,
          name: currentName !== undefined ? currentName : name,
          state:
            currentState === "all"
              ? undefined
              : currentState !== undefined
                ? currentState
                : state,
          role:
            Number(currentRole) === 0
              ? undefined
              : currentRole !== undefined
                ? currentRole
                : role,
          include: "role",
          allHierarchy: true,
          order: "id:DESC",
        });
        setUsers(res.data.users);
        setTotalItems(res.data.pagination.total);
        setIsLoading(false);
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
    },
    [nameAccount, name, state, role, t, setErrorFromResponse, setIsLoading],
  );

  /** Fetches roles (agent, member) and runs initial search. */
  const fetchInit = useCallback(async () => {
    try {
      const result = await getRoles({
        roleNames: "agent, member",
        order: "id:ASC",
      });
      const allOption: Role = {
        id: 0,
        chinese_name: t("common_all"),
      } as Role;
      setRoles([allOption, ...(result.data.roles || [])]);
      handleSearch(currentPage, pageSize);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    handleSearch,
    t,
    setErrorFromResponse,
    setIsLoading,
  ]);

  useEffect(() => {
    if (!didFetch.current) {
      fetchInit();
      didFetch.current = true;
    }
  }, [fetchInit]);

  /** Changes page and refetches with current filters. */
  const handlePageChange = async (page: number) => {
    if (currentPage !== page) {
      setCurrentPage(page);
      await handleSearch(page, pageSize, name, state, role);
    }
  };

  /** Changes page size and refetches from first page. */
  const handleLimitChange = async (limit: number) => {
    if (limit !== pageSize) {
      setPageSize(limit);
      setCurrentPage(1);
      await handleSearch(1, limit, name, state, role);
    }
  };

  const columns: ColumnDef<User>[] = [
    { accessorKey: "id", header: t("pm_id"), size: 60 },
    {
      accessorKey: "level",
      header: t("pm_level_role"),
      size: 60,
      cell: ({ row }) => {
        return (
          <span>
            [{row.original.level}]
            {row.original.role?.chinese_name === "会员"
              ? t("member")
              : row.original.role?.chinese_name === "代理"
                ? t("agent")
                : ""}
          </span>
        );
      },
    },
    { accessorKey: "account", header: t("pm_account") },
    { accessorKey: "name", header: t("pm_name") },
    {
      accessorKey: "state",
      header: t("pm_state"),
      size: 60,
      cell: ({ row }) => {
        const stateValue = row.original.state;
        if (stateValue === "suspension") {
          return (
            <p className="font-red font-medium">{t("common_suspension")}</p>
          );
        } else if (stateValue === "freeze") {
          return <p className="font-red font-medium">{t("common_freeze")}</p>;
        } else {
          return <p className="font-green font-medium">{t("common_normal")}</p>;
        }
      },
    },
    {
      accessorKey: "balance",
      header: t("pm_amount"),
      size: 100,
    },
    {
      accessorKey: "createdAt",
      header: t("pm_created_at"),
      size: 100,
      cell: ({ row }) =>
        dayjs(row.original.createdAt).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      accessorKey: "updatedAt",
      header: t("pm_updated_at"),
      size: 100,
      cell: ({ row }) =>
        dayjs(row.original.updatedAt).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex flex-col md:flex-row md:gap-0 md:items-center gap-2">
            <div />
            <SelectField
              id="name_account"
              required={false}
              value={nameAccount}
              onChange={(newValue) => setNameAccount(newValue)}
              options={nameAccounts.map((d) => ({
                value: String(d.id),
                label: d.name,
              }))}
              selectWidth="w-full"
            />
          </div>
          <InputField
            id="account"
            label=""
            labelWidth=""
            inputWidth="w-53 items-center"
            value={name}
            required={false}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder={t(
              nameAccounts.find((acc) => acc.id === nameAccount)?.name || "",
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div>
            <SelectField
              id="state"
              label={t("pm_state")}
              required={false}
              value={state}
              labelWidth=""
              selectWidth="w-60"
              autoSelectFirst={true}
              onChange={(newValue) => setState(newValue)}
              options={stateData.map((d) => ({
                value: String(d.id),
                label: d.name,
              }))}
            />
          </div>
          <div>
            <SelectField
              id="role"
              label={t("pm_role")}
              required={false}
              value={role}
              labelWidth=""
              selectWidth="w-60"
              autoSelectFirst={true}
              onChange={(newValue) => setRole(newValue)}
              options={roles.map((d) => ({
                value: d.id,
                label:
                  d.chinese_name === "代理"
                    ? t("pm_agent")
                    : d.chinese_name === "会员"
                      ? t("pm_member")
                      : d.chinese_name,
              }))}
            />
          </div>
        </div>
        <div className="flex flex-row items-center gap-2 mb-4">
          <div className="flex  gap-3">
            <Checkbox id="dir_sub_flg" />
            <Label htmlFor="dir_sub_flg">
              {t("include_direct_subordinates")}
            </Label>
          </div>
          <div className="flex justify-start mt-1 gap-2">
            <Button
              variant="info"
              onClick={() => {
                handleSearch(currentPage, pageSize, name, state, role);
              }}
            >
              {t("common_search")}
            </Button>
          </div>
        </div>
        <div className="space-y-4 mb-1">
          <DataTable columns={columns} data={users} title={t("pm_title")} />
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
          setNameAccount("account");
          setName("");
          setState("");
          setRole("");
          handleSearch(currentPage, pageSize, "", "", "");
        }}
        status="fail"
        message={errorMessage ?? ""}
      />
    </>
  );
};

export default PersonnelManagement;
