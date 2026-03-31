import { getGames } from "@/api/admin/game";
import { getRateLimits, OperateRateLimits } from "@/api/admin/rate-limit";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import InputField from "@/components/shared/InputField";
import SelectField from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/contexts/authGuardContext";
import { useLoading } from "@/contexts/useLoading";
import { Game } from "@/types";
import { RateLimit } from "@/types/RateLimit";
import { translateError } from "@/validation/messages/translateError";
import { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FieldError } from "react-hook-form";
import { useTranslation } from "react-i18next";

/**
 * Rate limit management: CRUD table for game min_bet/max_bet by game.
 */
const RateLimitManagement = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [originalRateLimits, setOriginalRateLimits] = useState<RateLimit[]>([]);
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

  const rateLimitsRef = useRef(rateLimits);
  useEffect(() => {
    rateLimitsRef.current = rateLimits;
  }, [rateLimits]);

  /** Fetches rate limits (with game) and games list. */
  const fetchRateLimits = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getRateLimits({
        include: "game",
        order: "game_id:ASC",
      });
      const formattedData = result.data.rate_limits.map((item: RateLimit) => ({
        ...item,
        new_flg: false,
        edit_flg: false,
      }));
      setRateLimits(formattedData);
      setOriginalRateLimits(formattedData);
      const gameRes = await getGames();
      setGames(gameRes.data.games || []);
      setSelectedRowIds({});
      setIsLoading(false);
    } catch (error) {
      setErrorFromResponse(error);
      setIsLoading(false);
    }
  }, [setErrorFromResponse, setIsLoading]);

  useEffect(() => {
    if (!didFetch.current) {
      fetchRateLimits();
      didFetch.current = true;
    }
  }, [refreshKey, fetchRateLimits]);

  /** Returns next id for new rate limit row. */
  const getNextId = () => {
    const maxId = Math.max(0, ...rateLimits.map((r) => Number(r.id)));
    return maxId + 1;
  };

  /** Appends a new editable rate limit row. */
  const handleAddRow = () => {
    const id = getNextId();
    const newRow: RateLimit = {
      id: id,
      game_id: games.length > 0 ? games[0].id : 0,
      min_bet: 0,
      max_bet: 0,
      new_flg: true,
      edit_flg: true,
    };
    setRateLimits((prev) => [...prev, newRow]);
    setSelectedRowIds((prev) => ({
      ...prev,
      [id]: false,
    }));
  };

  /** Enables edit mode for the given rate limit rows. */
  const handleEditRows = (rows: RateLimit[]) => {
    const targetIds = rows.map((r) => r.id);
    setRateLimits((prev) =>
      prev.map((item) =>
        targetIds.includes(item.id) ? { ...item, edit_flg: true } : item,
      ),
    );
  };

  /** Enables edit mode for a single rate limit row. */
  const handleEditRow = (row: RateLimit) => {
    setRateLimits((prev) =>
      prev.map((item) =>
        item.id === row.id ? { ...item, edit_flg: true } : item,
      ),
    );
  };

  /** Marks rows for delete and removes from table. */
  const handleDeleteRows = (rows: RateLimit[]) => {
    const targetIds = rows.map((r) => r.id);
    setDeletedIds((prev) => [
      ...new Set([
        ...prev,
        ...rows.filter((r) => !r.new_flg).map((r) => Number(r.id)),
      ]),
    ]);
    setRateLimits((prev) =>
      prev.filter((r) => !targetIds.includes(Number(r.id))),
    );
  };

  /** Deletes a single row; adds id to deletedIds if not new. */
  const handleDeleteRow = (row: RateLimit) => {
    if (!row.new_flg) {
      setDeletedIds((prev) => [...new Set([...prev, Number(row.id)])]);
    }
    setRateLimits((prev) => prev.filter((item) => item.id !== row.id));
    setSelectedRowIds((prev) => {
      const next = { ...prev };
      delete next[Number(row.id)];
      return next;
    });
  };

  /** Returns true if row is new or min_bet/max_bet differs from original. */
  const isRowDirty = (current: RateLimit | undefined) => {
    if (!current) return true;
    const original = originalRateLimits.find(
      (orig) => String(orig.id) === String(current.id),
    );
    if (!original) return true;
    return (
      (current.min_bet ?? "") !== (original.min_bet ?? "") ||
      (current.max_bet ?? "") !== (original.max_bet ?? "")
    );
  };

  const isDataChanged = useMemo(() => {
    if (rateLimits.length !== originalRateLimits.length) return true;
    if (deletedIds.length > 0) return true;
    const currentData = rateLimits.map(({ id, game_id, min_bet, max_bet }) => ({
      id,
      game_id,
      min_bet,
      max_bet,
    }));
    const originalData = originalRateLimits.map(
      ({ id, game_id, min_bet, max_bet }) => ({
        id,
        game_id,
        min_bet,
        max_bet,
      }),
    );
    return JSON.stringify(currentData) !== JSON.stringify(originalData);
  }, [rateLimits, originalRateLimits, deletedIds]);

  const columns = useMemo<ColumnDef<RateLimit>[]>(
    () => [
      {
        accessorKey: "game.name",
        header: t("rlm_game"),
        cell: ({ row }) => {
          const isNew = row.original.new_flg;
          const currentGame = games.find(
            (r) => r.name === row.original.game?.name,
          );
          const value = currentGame
            ? currentGame.type === "NIUNIU"
              ? t("rlm_niuniu")
              : currentGame.type === "BACCARAT"
                ? t("rlm_baccarat")
                : t("rlm_longhu")
            : "";
          if (!isNew) return <div className="text-center">{value}</div>;
          return (
            <SelectField
              id="game_id"
              labelWidth=""
              value={String(row.original.game_id)}
              options={games.map((game) => ({
                value: String(game.id),
                label:
                  game.type === "NIUNIU"
                    ? t("rlm_niuniu")
                    : game.type === "BACCARAT"
                      ? t("rlm_baccarat")
                      : game.type === "LONGHU"
                        ? t("rlm_longhu")
                        : game.name,
              }))}
              onChange={(val) => {
                setRateLimits((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id
                      ? { ...r, game_id: Number(val) }
                      : r,
                  ),
                );
              }}
            />
          );
        },
      },
      {
        accessorKey: "min_bet",
        header: t("rlm_min_bet"),
        cell: ({ row }) => {
          const id = row.original.id;
          const isChecked = !!selectedRowIds[Number(id)];
          const currentVal = String(row.original.min_bet ?? "");
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
                message: t("rlm_fill_min_bet"),
                type: "required",
              } as FieldError)
            : undefined;
          const minMaxError =
            Number(row.original.min_bet) > Number(row.original.max_bet)
              ? ({
                  message: t("rlm_min_bet_error"),
                  type: "validate",
                } as FieldError)
              : undefined;
          const zeroError =
            Number(row.original.min_bet) < 1
              ? ({
                  message: t("rlm_zero_error"),
                  type: "validate",
                } as FieldError)
              : undefined;
          const finalMinError = blankError || minMaxError || zeroError;
          return (
            <InputField
              id={`min_bet-${row.original.id}`}
              type="number"
              labelWidth=""
              horizontal={false}
              required={false}
              value={row.original.min_bet.toString() ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setRateLimits((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id
                      ? { ...r, min_bet: val as unknown as number }
                      : r,
                  ),
                );
              }}
              inputWidth="w-full"
              inputClassName="font-mono text-sm leading-relaxed text-left w-full block"
              error={translateError(t, "rlm_min_bet", finalMinError)}
            />
          );
        },
      },
      {
        accessorKey: "max_bet",
        header: t("rlm_max_bet"),
        cell: ({ row }) => {
          const id = row.original.id;
          const isChecked = !!selectedRowIds[Number(id)];
          const currentVal = String(row.original.max_bet ?? "");
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
                message: t("rlm_fill_max_bet"),
                type: "required",
              } as FieldError)
            : undefined;
          const maxMinError =
            Number(row.original.max_bet) < Number(row.original.min_bet)
              ? ({
                  message: t("rlm_max_bet_error"),
                  type: "validate",
                } as FieldError)
              : undefined;
          const zeroError =
            Number(row.original.max_bet) < 1
              ? ({
                  message: t("rlm_zero_error"),
                  type: "validate",
                } as FieldError)
              : undefined;
          const finalMaxError = blankError || maxMinError || zeroError;
          return (
            <InputField
              id={`max_bet-${row.original.id}`}
              type="number"
              labelWidth=""
              horizontal={false}
              required={false}
              value={row.original.max_bet.toString() ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setRateLimits((prev) =>
                  prev.map((r) =>
                    r.id === row.original.id
                      ? { ...r, max_bet: val as unknown as number }
                      : r,
                  ),
                );
              }}
              inputWidth="w-full"
              inputClassName="font-mono text-sm leading-relaxed text-left w-full block"
              error={translateError(t, "rlm_max_bet", finalMaxError)}
            />
          );
        },
      },
    ],
    [t, selectedRowIds, games],
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
      const item = rateLimitsRef.current.find((a) => String(a.id) === id);
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
      setRateLimits((prev) =>
        prev.map((item) => {
          if (trulyRemovedIds.includes(String(item.id))) {
            return { ...item, edit_flg: false };
          }
          return item;
        }),
      );
    }
  };

  const hasErrors = useMemo(() => {
    return rateLimits.some(
      (row) =>
        !row.min_bet ||
        !row.max_bet ||
        row.max_bet < row.min_bet ||
        row.min_bet < 1 ||
        row.max_bet < 1,
    );
  }, [rateLimits]);

  const canSubmit = useMemo(() => {
    return isDataChanged && !hasErrors;
  }, [isDataChanged, hasErrors]);

  /** Sends creates/updates/deletes to OperateRateLimits API and refreshes on success. */
  const onSubmit = async () => {
    setIsLoading(true);
    try {
      const creates = rateLimits
        .filter((row) => row.new_flg)
        .map(({ game_id, min_bet, max_bet }) => ({
          game_id,
          min_bet,
          max_bet,
        }));
      const updates = rateLimits
        .filter((row) => !row.new_flg)
        .filter((row) => {
          const original = originalRateLimits.find((ora) => ora.id === row.id);
          if (!original) return false;
          return (
            row.game_id !== original.game_id ||
            row.min_bet !== original.min_bet ||
            row.max_bet !== original.max_bet
          );
        })
        .map(({ id, game_id, min_bet, max_bet }) => {
          const updateObj: Partial<RateLimit> & { id: number } = {
            id: id as number,
            game_id,
            min_bet,
            max_bet,
          };
          return updateObj;
        });

      const payload = {
        creates,
        updates,
        deletes: deletedIds,
      };
      const result = await OperateRateLimits(payload);
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
        span={4}
        data={rateLimits}
        originalData={originalRateLimits}
        title={t("rlm_main_title")}
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
        message={t("rlm_success_modify")}
      />
    </>
  );
};

export default RateLimitManagement;
