import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { User } from "@/types/User";
import { getUsers, OperateUsers } from "@/api/admin/user";
import { getRoles } from "@/api/admin/role";
import { Role } from "@/types/Role";
import SelectField from "@/components/shared/SelectField";
import InputField from "@/components/shared/InputField";
import { translateError } from "@/validation/messages/translateError";
import { FieldError } from "react-hook-form";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

/**
 * Developer/staff user management: CRUD table for users with role, account, name, password.
 */
const DeveloperUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [originalUsers, setOriginalUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<
    Record<string | number, boolean>
  >({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const didFetch = useRef(false);

  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      const load = async () => {
        try {
          setIsLoading(true);
          const result = await getUsers({
            role_name: "developer, staff",
            include: "role",
            order: "id:ASC",
          });
          const formattedData = result.data.users.map((item: User) => ({
            ...item,
            password: "",
            new_flg: false,
            edit_flg: false,
          }));
          setUsers(formattedData);
          setOriginalUsers(formattedData);

          const res = await getRoles({
            roleNames: "developer, staff",
            order: "name",
          });
          setRoles(res.data.roles || []);
          setSelectedRowIds({});
          setIsLoading(false);
        } catch (error) {
          setErrorFromResponse(error);
          setIsLoading(false);
        }
      };
      load();
    }
  }, [refreshKey, setIsLoading, setErrorFromResponse]);

  /** Returns next id for new user row (max existing id + 1). */
  const getNextId = () => {
    const maxId = Math.max(0, ...users.map((r) => Number(r.id)));
    return maxId + 1;
  };

  /** Appends a new editable user row. */
  const handleAddRow = () => {
    const id = getNextId();
    const newRow: User = {
      id: id,
      role_id: roles.length > 0 ? roles[0].id : 0,
      account: "",
      name: "",
      password: "",
      new_flg: true,
      edit_flg: true,
    };
    setUsers((prev) => [...prev, newRow]);
    setSelectedRowIds((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  /** Enables edit mode for the given user rows. */
  const handleEditRows = (rows: User[]) => {
    const targetIds = rows.map((r) => r.id);
    setUsers((prev) =>
      prev.map((item) =>
        targetIds.includes(item.id) ? { ...item, edit_flg: true } : item,
      ),
    );
  };

  /** Enables edit mode for a single user row. */
  const handleEditRow = (row: User) => {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, edit_flg: true } : item,
      ),
    );
  };

  /** Marks rows for delete and removes from table. */
  const handleDeleteRows = (rows: User[]) => {
    const targetIds = rows.map((r) => r.id);
    setDeletedIds((prev) => [
      ...new Set([
        ...prev,
        ...rows.filter((r) => !r.new_flg).map((r) => Number(r.id)),
      ]),
    ]);
    setUsers((prev) => prev.filter((r) => !targetIds.includes(Number(r.id))));
  };

  /** Deletes a single row; adds id to deletedIds if not new. */
  const handleDeleteRow = (row: User) => {
    if (!row.new_flg) {
      setDeletedIds((prev) => [...new Set([...prev, Number(row.id)])]);
    }
    setUsers((prev) => prev.filter((item) => item.id !== row.id));
    setSelectedRowIds((prev) => {
      const next = { ...prev };
      delete next[Number(row.id)];
      return next;
    });
  };

  /** Returns true if row is new or any field differs from original. */
  const isRowDirty = (current: User | undefined) => {
    if (!current) return true;
    const original = originalUsers.find(
      (orig) => String(orig.id) === String(current.id),
    );
    if (!original) return true;
    return (
      (current.role_id ?? "") !== (original.role_id ?? "") ||
      (current.account ?? "") !== (original.account ?? "") ||
      (current.name ?? "") !== (original.name ?? "") ||
      (current.password ?? "") !== (original.password ?? "")
    );
  };

  const isDataChanged = useMemo(() => {
    if (users.length !== originalUsers.length) return true;
    if (deletedIds.length > 0) return true;
    const currentData = users.map(
      ({ id, role_id, account, name, password }) => ({
        id,
        role_id,
        account,
        name,
        password,
      }),
    );
    const originalData = originalUsers.map(
      ({ id, role_id, account, name, password }) => ({
        id,
        role_id,
        account,
        name,
        password,
      }),
    );
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  }, [users, originalUsers, deletedIds]);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "role.name",
        header: t("dum_role"),
        cell: ({ row }) => {
          const isNew = row.original.new_flg;
          const currentRole = roles.find(
            (r) => r.name === row.original.role?.name,
          );
          const value = currentRole
            ? currentRole.chinese_name === "开发者"
              ? t("dum_developer")
              : currentRole.chinese_name === "员工"
                ? t("dum_staff")
                : currentRole.chinese_name
            : "";
          if (!isNew) return <div className="text-center">{value}</div>;
          return (
            <SelectField
              id="role_id"
              labelWidth=""
              value={String(row.original.role_id)}
              options={roles.map((role) => ({
                value: String(role.id),
                label:
                  role.chinese_name === "开发者"
                    ? t("dum_developer")
                    : role.chinese_name === "员工"
                      ? t("dum_staff")
                      : role.chinese_name,
              }))}
              onChange={(val) => {
                setUsers((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id
                      ? { ...r, role_id: Number(val) }
                      : r,
                  ),
                );
              }}
            />
          );
        },
      },
      {
        accessorKey: "account",
        header: t("dum_account"),
        cell: ({ row }) => {
          const id = row.original.id;
          const isChecked = !!selectedRowIds[Number(id)];
          const currentVal = row.original.account;
          const showInput =
            row.original.new_flg || (row.original.edit_flg && isChecked);
          if (!showInput) {
            return (
              <div className="text-center whitespace-pre-wrap">
                {currentVal}
              </div>
            );
          }
          const blankError = !currentVal?.trim()
            ? ({
                message: t("dum_fill_acount"),
                type: "required",
              } as FieldError)
            : undefined;
          return (
            <InputField
              id={`account-${row.original.id}`}
              labelWidth=""
              required={false}
              horizontal={false}
              value={row.original.account}
              onChange={(e) => {
                const val = e.target.value;
                setUsers((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id ? { ...r, account: val } : r,
                  ),
                );
              }}
              inputClassName="font-mono text-sm leading-relaxed whitespace-pre-wrap"
              error={translateError(t, "dum_account", blankError)}
            />
          );
        },
      },
      {
        accessorKey: "name",
        header: t("dum_name"),
        cell: ({ row }) => {
          const id = row.original.id;
          const isChecked = !!selectedRowIds[Number(id)];
          const currentVal = row.original.name;
          const showInput =
            row.original.new_flg || (row.original.edit_flg && isChecked);
          if (!showInput) {
            return (
              <div className="text-center whitespace-pre-wrap">
                {currentVal}
              </div>
            );
          }
          const blankError = !currentVal?.trim()
            ? ({
                message: t("dum_fill_name"),
                type: "required",
              } as FieldError)
            : undefined;
          return (
            <InputField
              id={`name-${row.original.id}`}
              labelWidth=""
              required={false}
              horizontal={false}
              value={row.original.name}
              onChange={(e) => {
                const val = e.target.value;
                setUsers((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id ? { ...r, name: val } : r,
                  ),
                );
              }}
              inputClassName="font-mono text-sm leading-relaxed whitespace-pre-wrap"
              error={translateError(t, "dum_name", blankError)}
            />
          );
        },
      },
      {
        accessorKey: "password",
        header: t("dum_password"),
        cell: ({ row }) => {
          const id = row.original.id;
          const isChecked = !!selectedRowIds[Number(id)];
          const currentVal = row.original.password;
          const showInput =
            row.original.new_flg || (row.original.edit_flg && isChecked);
          if (!showInput) {
            return (
              <div className="text-center whitespace-pre-wrap">
                {currentVal}
              </div>
            );
          }
          const blankError =
            row.original.new_flg && !currentVal?.trim()
              ? ({
                  message: t("dum_fill_password"),
                  type: "required",
                } as FieldError)
              : undefined;
          return (
            <InputField
              id={`password-${row.original.id}`}
              labelWidth=""
              required={false}
              horizontal={false}
              value={row.original.password}
              onChange={(e) => {
                const val = e.target.value;
                setUsers((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id ? { ...r, password: val } : r,
                  ),
                );
              }}
              inputClassName="font-mono text-sm leading-relaxed whitespace-pre-wrap"
              error={translateError(t, "dum_name", blankError)}
            />
          );
        },
      },
    ],
    [t, selectedRowIds, roles],
  );

  /** Keeps selection for dirty rows; clears edit_flg for deselected clean rows. */
  const handleSelectionChange = (
    newSelection: Record<string | number, boolean>,
  ) => {
    const currentSelectedIds = Object.keys(selectedRowIds).filter(
      (id) => selectedRowIds[id],
    );
    const newSelectedIds = Object.keys(newSelection).filter(
      (id) => newSelection[id],
    );
    const removedIds = currentSelectedIds.filter(
      (id) => !newSelectedIds.includes(id),
    );

    const dirtyRemovedSelection: Record<string | number, boolean> = {};
    removedIds.forEach((id) => {
      const item = usersRef.current.find((a) => String(a.id) === id);
      if (item && !item.new_flg && isRowDirty(item)) {
        dirtyRemovedSelection[id] = true;
      }
    });
    const finalSelection = {
      ...newSelection,
      ...dirtyRemovedSelection,
    };
    setSelectedRowIds(finalSelection);
    const trulyRemovedIds = removedIds.filter(
      (id) => !dirtyRemovedSelection[id],
    );
    if (trulyRemovedIds.length > 0) {
      setUsers((prev) =>
        prev.map((item) => {
          if (trulyRemovedIds.includes(String(item.id))) {
            return { ...item, edit_flg: false };
          }
          return item;
        }),
      );
    }
  };
  const hasBlankFields = useMemo(() => {
    return users.some(
      (row) =>
        !row.account?.trim() ||
        !row.name?.trim() ||
        (row.new_flg && !row.password?.trim()),
    );
  }, [users]);

  const canSubmit = useMemo(() => {
    return isDataChanged && !hasBlankFields;
  }, [isDataChanged, hasBlankFields]);

  /** Sends creates/updates/deletes to OperateUsers API and refreshes on success. */
  const onSubmit = async () => {
    setIsLoading(true);
    try {
      const creates = users
        .filter((row) => row.new_flg)
        .map(({ role_id, account, name, password }) => ({
          role_id,
          account,
          name,
          password,
        }));
      const updates = users
        .filter((row) => !row.new_flg)
        .filter((row) => {
          const original = originalUsers.find((ora) => ora.id === row.id);
          if (!original) return false;
          return (
            row.account !== original.account ||
            row.name !== original.name ||
            row.password !== original.password
          );
        })
        .map(({ id, role_id, account, name, password }) => {
          const updateObj: Partial<User> & { id: number } = {
            id: id as number,
            role_id,
            account,
            name,
          };
          if (password !== null && password !== undefined) {
            updateObj.password = password;
          }
          return updateObj;
        });

      const payload = {
        creates,
        updates,
        deletes: deletedIds,
      };
      const result = await OperateUsers(payload);
      setIsLoading(false);
      if (result.success) {
        setRefreshKey((v) => v + 1);
        setDeletedIds([]);
        setSuccessDialogOpen(true);
        didFetch.current = false;
      }
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <DataTable
        columns={columns}
        span={5}
        data={users}
        originalData={originalUsers}
        title={t("dum_main_title")}
        getRowId={(row) => Number(row.id)}
        enableRowSelection
        selectedRowIds={selectedRowIds}
        onSelectionChange={handleSelectionChange}
        canEditRow={(row) => !row.new_flg}
        canDeleteRow={true}
        canDeleteSelectRow={true}
        canDeleteAllRow={true}
        onAllEdit={(rows) => handleEditRows(rows)}
        onSelectEdit={(rows) => handleEditRows(rows)}
        onSingleEdit={(row) => handleEditRow(row)}
        onAllDelete={(rows) => handleDeleteRows(rows)}
        onSelectDelete={(rows) => handleDeleteRows(rows)}
        onSingleDelete={(row) => handleDeleteRow(row)}
      />
      <div className="h-10" />
      <div className="fixed bottom-0 z-49 flex items-center gap-2 bg-white p-2 w-full">
        <Button
          variant="info"
          onClick={() => setConfirmDialogOpen(true)}
          disabled={!canSubmit}
        >
          {t("common_submit")}
        </Button>
        <Button onClick={handleAddRow}>{t("d_add")}</Button>
      </div>
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        status="fail"
        message={errorMessage ?? ""}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
        }}
        onConfirm={() => {
          setConfirmDialogOpen(false);
          onSubmit();
        }}
        status="confirm"
      />
      <ConfirmDialog
        open={successDialogOpen}
        onClose={() => {
          setSuccessDialogOpen(false);
        }}
        status="success"
        message={t("dum_success_modify")}
      />
    </>
  );
};

export default DeveloperUserManagement;
