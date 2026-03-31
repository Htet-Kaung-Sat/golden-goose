import {
  getAnnounces,
  operateAnnounces,
  getMemberOverview,
} from "@/api/admin/announce";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import ErrorTooltip from "@/components/shared/ErrorTooltip";
import TextareaField from "@/components/shared/TextareaField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { Announce } from "@/types/Announce";
import { MemberOverview, FlowOverview } from "@/types/index";
import { formatLocalDateTime } from "@/utils/DateFormat";
import { cn } from "@/lib/utils";
import { translateError } from "@/validation/messages/translateError";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState, useMemo, useRef } from "react";
import { FieldError } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useBlocker, useNavigate } from "react-router-dom";

const DEFAULT_FLOW_DATA: FlowOverview[] = [
  {
    company_deposit_count: 0,
    company_deposit_amount: 0,
    member_withdrawal_count: 0,
    member_withdrawal_amount: 0,
  },
];

/* Single-line input: no Enter, truncate by container's pixel width. */
const InputCell = ({
  id,
  initialValue,
  onSave,
  error,
}: {
  id: number;
  initialValue: string;
  onSave: (v: string) => void;
  error?: string | undefined;
}) => {
  const [localVal, setLocalVal] = useState(initialValue);

  useEffect(() => {
    setLocalVal(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\r?\n/g, "");
    const truncated = raw.slice(0, 255);
    setLocalVal(truncated);
    onSave(truncated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden">
      <ErrorTooltip error={error}>
        <Input
          id={`title-${id}`}
          value={localVal}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={
            error
              ? "w-full !border-red-400 !ring-red-400 !focus:ring-red-400"
              : "w-full"
          }
        />
      </ErrorTooltip>
    </div>
  );
};

/* Textarea – fixed width, wraps and scrolls vertically (no x-axis expansion) */
const TextareaCell = ({
  id,
  initialValue,
  onSave,
  error,
}: {
  id: number;
  initialValue: string;
  onSave: (v: string) => void;
  error?: string | undefined;
}) => {
  const [localVal, setLocalVal] = useState(initialValue);

  useEffect(() => {
    setLocalVal(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const truncated = value.slice(0, 5000);
    setLocalVal(truncated);
    onSave(truncated);
  };

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden">
      <TextareaField
        id={`content-${id}`}
        value={localVal}
        horizontal={false}
        rows={3}
        onChange={handleChange}
        inputClassName={cn(
          "font-mono text-sm leading-relaxed whitespace-pre-wrap break-words max-w-full w-full box-border overflow-x-hidden overflow-y-auto resize-none max-h-28",
        )}
        error={error}
      />
    </div>
  );
};

/**
 * Admin dashboard: agent announcement table (CRUD) or subaccount member/flow overview tables.
 */
const Dashboard = () => {
  const stored = localStorage.getItem("loginUser");
  const loginUser = stored ? JSON.parse(stored) : null;
  const [announces, setAnnounces] = useState<Announce[]>([]);
  const [originalAnnounces, setOriginalAnnounces] = useState<Announce[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<
    Record<string | number, boolean>
  >({});
  const [memberOverviews, setMemberOverviews] = useState<MemberOverview[]>([]);
  const [flowOverviews, setFlowOverviews] = useState<FlowOverview[]>([]);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const didFetch = useRef(false);

  const announcesRef = useRef(announces);
  useEffect(() => {
    announcesRef.current = announces;
  }, [announces]);

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      if (loginUser?.role === "agent") {
        const load = async () => {
          try {
            setIsLoading(true);
            const filter = { type: 0 };
            const announce = await getAnnounces(filter);
            const formattedData = announce.data.announces.map(
              (item: Announce) => ({
                ...item,
                new_flg: false,
                edit_flg: false,
              }),
            );
            setAnnounces(formattedData);
            setOriginalAnnounces(formattedData);
            setSelectedRowIds({});
            setIsLoading(false);
          } catch (error) {
            setErrorFromResponse(error);
            setIsLoading(false);
          }
        };
        load();
      } else {
        const load = async () => {
          try {
            setIsLoading(true);
            const results = await getMemberOverview();
            setMemberOverviews(results.data.memberOverviews);
            setFlowOverviews(DEFAULT_FLOW_DATA);
            setIsLoading(false);
          } catch (error) {
            setErrorFromResponse(error);
            setIsLoading(false);
          }
        };
        load();
      }
    }
  }, [refreshKey, loginUser?.role, setIsLoading, setErrorFromResponse]);

  /** Returns next available id for new announcement row (max existing id + 1). */
  const getNextId = () => {
    const maxId = Math.max(0, ...announces.map((r) => Number(r.id)));
    return maxId + 1;
  };

  /** Appends a new editable announcement row. */
  const handleAddRow = () => {
    const id = getNextId();
    const newRow: Announce = {
      id: id,
      user_id: Number(loginUser?.id),
      title: "",
      content: "",
      new_flg: true,
      edit_flg: true,
    };
    setAnnounces((prev) => [...prev, newRow]);
    setSelectedRowIds((prev) => ({
      ...prev,
      [id]: false,
    }));
    setTimeout(() => {
      const input = document.getElementById(`title-${id}`);
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
  };

  /** Enables edit mode for the given announcement rows. */
  const handleEditRows = (rows: Announce[]) => {
    const targetIds = rows.map((r) => r.id);
    setAnnounces((prev) =>
      prev.map((item) =>
        targetIds.includes(item.id) ? { ...item, edit_flg: true } : item,
      ),
    );
  };

  /** Enables edit mode for a single announcement row. */
  const handleEditRow = (row: Announce) => {
    setAnnounces((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, edit_flg: true } : item,
      ),
    );
  };

  /** Marks given rows for delete (persisted ids) and removes from table. */
  const handleDeleteRows = (rows: Announce[]) => {
    const targetIds = rows.map((r) => r.id);
    setDeletedIds((prev) => [
      ...new Set([
        ...prev,
        ...rows.filter((r) => !r.new_flg).map((r) => Number(r.id)),
      ]),
    ]);
    setAnnounces((prev) =>
      prev.filter((r) => !targetIds.includes(Number(r.id))),
    );
  };

  /** Deletes a single row; adds id to deletedIds if not new. */
  const handleDeleteRow = (row: Announce) => {
    if (!row.new_flg) {
      setDeletedIds((prev) => [...new Set([...prev, Number(row.id)])]);
    }
    setAnnounces((prev) => prev.filter((item) => item.id !== row.id));
    setSelectedRowIds((prev) => {
      const next = { ...prev };
      delete next[Number(row.id)];
      return next;
    });
  };

  /** Returns true if row is new or title/content differs from original. */
  const isRowDirty = (current: Announce | undefined) => {
    if (!current) return true;
    const original = originalAnnounces.find(
      (orig) => String(orig.id) === String(current.id),
    );
    if (!original) return true;
    return (
      (current.title ?? "") !== (original.title ?? "") ||
      (current.content ?? "") !== (original.content ?? "")
    );
  };

  const isDataChanged = useMemo(() => {
    if (announces.length !== originalAnnounces.length) return true;
    if (deletedIds.length > 0) return true;
    const currentData = announces.map(({ id, title, content }) => ({
      id,
      title,
      content,
    }));
    const originalData = originalAnnounces.map(({ id, title, content }) => ({
      id,
      title,
      content,
    }));
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  }, [announces, originalAnnounces, deletedIds]);

  const columns = useMemo<ColumnDef<Announce>[]>(
    () => [
      {
        accessorKey: "title",
        header: t("d_title"),
        size: 200,
        cell: ({ row }) => {
          const id = row.original.id;
          const isChecked = !!selectedRowIds[Number(id)];
          const currentVal = row.original.title;
          const showInput =
            row.original.new_flg || (row.original.edit_flg && isChecked);
          if (!showInput) {
            return (
              <div className="text-center px-10 whitespace-pre-wrap">
                {currentVal}
              </div>
            );
          }
          const titleError = !row.original.title?.trim()
            ? ({ message: t("d_fill_title"), type: "required" } as FieldError)
            : undefined;
          return (
            <InputCell
              id={Number(id)}
              initialValue={row.original.title}
              onSave={(val) => {
                setAnnounces((prev) =>
                  prev.map((item) =>
                    item.id === Number(id) ? { ...item, title: val } : item,
                  ),
                );
              }}
              error={translateError(t, "d_title", titleError)}
            />
          );
        },
      },
      {
        accessorKey: "content",
        header: t("d_content"),
        size: 400,
        cell: ({ row }) => {
          const id = row.original.id;
          const isChecked = !!selectedRowIds[Number(id)];
          const currentVal = row.original.content;
          const showInput =
            row.original.new_flg || (row.original.edit_flg && isChecked);
          if (!showInput) {
            return (
              <div className="text-center px-10 whitespace-pre-wrap">
                {currentVal}
              </div>
            );
          }
          const blankError = !currentVal?.trim()
            ? ({ message: t("d_fill_content"), type: "required" } as FieldError)
            : undefined;
          return (
            <div className="min-w-0 max-w-full overflow-hidden">
              <TextareaCell
                id={Number(id)}
                initialValue={currentVal}
                onSave={(val) => {
                  setAnnounces((prev) =>
                    prev.map((item) =>
                      item.id === Number(id) ? { ...item, content: val } : item,
                    ),
                  );
                }}
                error={translateError(t, "d_content", blankError)}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: t("d_time"),
        size: 150,
        cell: ({ row }) => {
          return row.original.updatedAt
            ? formatLocalDateTime(String(row.original.updatedAt))
            : "-";
        },
      },
    ],
    [t, selectedRowIds],
  );

  /** Keeps selection for dirty rows when selection changes; clears edit_flg for deselected clean rows. */
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
      const item = announcesRef.current.find((a) => String(a.id) === id);
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
      setAnnounces((prev) =>
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
    return announces.some((row) => !row.title?.trim() || !row.content?.trim());
  }, [announces]);

  const hasOverLimit = useMemo(() => {
    return announces.some(
      (row) =>
        (row.title?.length ?? 0) > 255 || (row.content?.length ?? 0) > 5000,
    );
  }, [announces]);

  const canSubmit = useMemo(() => {
    return isDataChanged && !hasBlankFields && !hasOverLimit;
  }, [isDataChanged, hasBlankFields, hasOverLimit]);

  const leaveBlocker = useBlocker(
    Boolean(loginUser?.role === "agent" && isDataChanged),
  );

  /** Sends creates/updates/deletes to operateAnnounces API and refreshes on success. */
  const onSubmit = async () => {
    setIsLoading(true);
    try {
      const creates = announces
        .filter((row) => row.new_flg)
        .filter((row) => row.title?.trim() !== "" || row.content?.trim() !== "")
        .map(({ title, content, user_id }) => ({ title, content, user_id }));
      const updates = announces
        .filter((row) => !row.new_flg)
        .filter((row) => {
          const original = originalAnnounces.find((ora) => ora.id === row.id);
          if (!original) return false;
          return (
            row.title !== original.title || row.content !== original.content
          );
        })
        .map(({ id, title, content, user_id }) => ({
          id: id as number,
          title,
          content,
          user_id,
        }));

      const payload = {
        creates,
        updates,
        deletes: deletedIds,
      };
      const result = await operateAnnounces(payload);
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

  const memberOverviewColumns: ColumnDef<MemberOverview>[] = [
    {
      accessorKey: "total_member",
      header: t("cumulative_registered_members"),
    },
    {
      accessorKey: "register_today",
      header: t("register_today"),
    },
  ];

  const flowOverviewColumns: ColumnDef<FlowOverview>[] = [
    {
      accessorKey: "company_deposit_count",
      header: t("company_deposit_count"),
    },
    {
      accessorKey: "company_deposit_amount",
      header: t("company_deposit_amount"),
    },
    {
      accessorKey: "member_withdrawal_count",
      header: t("member_withdrawal_count"),
    },
    {
      accessorKey: "member_withdrawal_amount",
      header: t("member_withdrawal_amount"),
    },
  ];

  return (
    <div>
      {loginUser?.role === "agent" ? (
        <div className="pb-24 md:pb-16 px-4 md:px-0">
          <DataTable
            columns={columns}
            span={4}
            data={announces}
            originalData={originalAnnounces}
            title={t("d_main_title")}
            fixedLayout
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

          <div className="fixed bottom-0 w-full gap-3 flex flex-wrap items-center bg-white py-2">
            <Button
              variant="info"
              onClick={() => setConfirmDialogOpen(true)}
              disabled={!canSubmit}
            >
              {t("common_submit")}
            </Button>
            <Button onClick={handleAddRow}>{t("d_add")}</Button>
            <Button
              onClick={() => {
                navigate("/admin/user_announcement");
              }}
            >
              {t("d_user_announcement")}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mt-5">
            <DataTable
              columns={memberOverviewColumns}
              data={memberOverviews}
              title={t("member_overview")}
            />
          </div>
          <div className="mt-5">
            <DataTable
              columns={flowOverviewColumns}
              data={flowOverviews}
              title={t("inflow_outflow_overview")}
            />
          </div>
        </div>
      )}
      <ConfirmDialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
        }}
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
        message={t("d_success_modify")}
      />
      <ConfirmDialog
        open={leaveBlocker.state === "blocked"}
        onClose={() => leaveBlocker.reset?.()}
        onConfirm={() => leaveBlocker.proceed?.()}
        message={t("d_leave_unsaved")}
        status="confirm"
      />
    </div>
  );
};

export default Dashboard;
