import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { Result } from "@/types/Result";
import { getResults, OperateResults } from "@/api/admin/result";
import InputField from "@/components/shared/InputField";
import { FieldError } from "react-hook-form";
import { translateError } from "@/validation/messages/translateError";

/**
 * Result change page: editable table for result name and ratio (no create/delete).
 */
const ResultChange = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [originalResults, setOriginalResults] = useState<Result[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<
    Record<string | number, boolean>
  >({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    errorMessage,
    errorDialogOpen,
    setErrorDialogOpen,
    setErrorFromResponse,
  } = useAuthGuard();
  const { setIsLoading } = useLoading();
  const { t } = useTranslation();
  const didFetch = useRef(false);

  const resultsRef = useRef(results);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  /** Fetches results with game and sets table data. */
  const fetchResults = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getResults({ include: "game" });
      const formattedData = res.data.results.map((item: Result) => ({
        ...item,
        edit_flg: false,
      }));
      setResults(formattedData);
      setOriginalResults(formattedData);
      setSelectedRowIds({});
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [setErrorFromResponse, setIsLoading]);

  useEffect(() => {
    if (!didFetch.current) {
      fetchResults();
      didFetch.current = true;
    }
  }, [refreshKey, fetchResults]);

  /** Enables edit mode for the given result rows. */
  const handleEditRows = (rows: Result[]) => {
    const targetIds = rows.map((r) => r.id);
    setResults((prev) =>
      prev.map((item) =>
        targetIds.includes(item.id) ? { ...item, edit_flg: true } : item,
      ),
    );
  };

  /** Enables edit mode for a single result row. */
  const handleEditRow = (row: Result) => {
    setResults((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, edit_flg: true } : item,
      ),
    );
  };

  /** Returns true if row name or ratio differs from original. */
  const isRowDirty = (current: Result | undefined) => {
    if (!current) return true;
    const original = originalResults.find(
      (orig) => String(orig.id) === String(current.id),
    );
    if (!original) return true;
    return (
      (current.name ?? "") !== (original.name ?? "") ||
      (current.ratio ? parseFloat(Number(current.ratio).toFixed(2)) : "") !==
        (original.ratio ? parseFloat(Number(original.ratio).toFixed(2)) : "")
    );
  };

  const isDataChanged = useMemo(() => {
    const currentData = results.map(({ id, name, ratio }) => ({
      id,
      name,
      ratio: parseFloat(Number(ratio).toFixed(2)),
    }));
    const originalData = originalResults.map(({ id, name, ratio }) => ({
      id,
      name,
      ratio: parseFloat(Number(ratio).toFixed(2)),
    }));
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  }, [results, originalResults]);

  const columns = useMemo<ColumnDef<Result>[]>(
    () => [
      {
        accessorKey: "game.name",
        header: t("rsc_game_type"),
        size: 50,
      },
      {
        accessorKey: "baccarat_type",
        header: t("rsc_baccarat_type"),
        size: 100,
      },
      {
        accessorKey: "key",
        header: t("rsc_key"),
        size: 100,
      },
      {
        accessorKey: "name",
        header: t("rsc_name"),
        size: 200,
        cell: ({ row }) => {
          const isEditing =
            row.original.edit_flg &&
            row.original.id &&
            !!selectedRowIds[row.original.id];
          const currentVal = row.original.name;
          const blankError = !currentVal?.trim()
            ? ({ message: t("rsc_fill_name"), type: "required" } as FieldError)
            : undefined;
          if (!isEditing)
            return <div className="text-center">{row.original.name}</div>;
          return (
            <InputField
              id={`name-${row.original.id}`}
              labelWidth=""
              required={false}
              horizontal={false}
              value={row.original.name}
              onChange={(e) => {
                const val = e.target.value;
                setResults((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id ? { ...r, name: val } : r,
                  ),
                );
              }}
              inputClassName="font-mono text-sm leading-relaxed whitespace-pre-wrap"
              error={translateError(t, "rsc_name", blankError)}
            />
          );
        },
      },
      {
        accessorKey: "ratio",
        header: t("rsc_ratio"),
        size: 80,
        cell: ({ row }) => {
          const isEditing =
            row.original.edit_flg &&
            row.original.id &&
            !!selectedRowIds[row.original.id];
          const currentVal = row.original.ratio;
          const blankError = !currentVal
            ? ({ message: t("rsc_fill_ratio"), type: "required" } as FieldError)
            : undefined;
          if (!isEditing)
            return (
              <div className="text-center font-mono">{row.original.ratio}</div>
            );
          return (
            <InputField
              id={`ratio-${row.original.id}`}
              type="number"
              labelWidth=""
              horizontal={false}
              required={false}
              value={row.original.ratio?.toString() ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setResults((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id
                      ? { ...r, ratio: val as unknown as number }
                      : r,
                  ),
                );
              }}
              inputWidth="w-full"
              inputClassName="font-mono text-sm leading-relaxed text-left w-full block"
              error={translateError(t, "rsc_ratio", blankError)}
            />
          );
        },
      },
    ],
    [t, selectedRowIds],
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
      const item = resultsRef.current.find((a) => String(a.id) === id);
      if (item && isRowDirty(item)) {
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
      setResults((prev) =>
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
    return results.some((row) => !row.name?.trim() || !row.ratio);
  }, [results]);

  const canSubmit = useMemo(() => {
    return isDataChanged && !hasBlankFields;
  }, [isDataChanged, hasBlankFields]);

  /** Sends result updates (name, ratio) to OperateResults API. */
  const onSubmit = async () => {
    setIsLoading(true);
    try {
      const updates = results
        .filter((row) => {
          const original = originalResults.find((ores) => ores.id === row.id);
          if (!original) return false;
          return (
            row.name !== original.name ||
            parseFloat(Number(row.ratio).toFixed(2)) !==
              parseFloat(Number(original.ratio).toFixed(2))
          );
        })
        .map(({ id, name, ratio }) => ({
          id: id as number,
          name,
          ratio: parseFloat(Number(ratio).toFixed(2)),
        }));

      const payload = {
        updates,
      };
      const result = await OperateResults(payload);
      setIsLoading(false);
      if (result.success) {
        setRefreshKey((v) => v + 1);
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
        span={6}
        data={results}
        originalData={originalResults}
        title={t("rsc_main_title")}
        getRowId={(row) => Number(row.id)}
        enableRowSelection
        selectedRowIds={selectedRowIds}
        onSelectionChange={handleSelectionChange}
        canDeleteRow={false}
        canDeleteSelectRow={false}
        canDeleteAllRow={false}
        onAllEdit={(rows) => handleEditRows(rows)}
        onSelectEdit={(rows) => handleEditRows(rows)}
        onSingleEdit={(row) => handleEditRow(row)}
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
        message={t("rsc_success_modify")}
      />
    </>
  );
};

export default ResultChange;
