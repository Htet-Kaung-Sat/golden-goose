import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { useTranslation } from "react-i18next";
import RowActions from "./RowActions";
import CheckboxField from "./CheckboxField";
import { RowData } from "@tanstack/react-table";
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    isAllDisabled: boolean;
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  originalData?: TData[];
  title?: string;
  expandedRowId?: number | string | null | number[];
  enableRowSelection?: boolean;
  selectedRowIds?: Record<string | number, boolean>;
  span?: number;
  onSelectionChange?: (ids: Record<string | number, boolean>) => void;
  canEditRow?: (row: TData) => boolean;
  canDeleteRow?: boolean;
  canDeleteSelectRow?: boolean;
  canDeleteAllRow?: boolean;
  getRowId?: (row: TData) => number | string;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  onAllEdit?: (rows: TData[]) => void;
  onSelectEdit?: (rows: TData[]) => void;
  onSingleEdit?: (row: TData) => void;
  onAllDelete?: (rows: TData[]) => void;
  onSelectDelete?: (rows: TData[]) => void;
  onSingleDelete?: (row: TData) => void;
  /**For Dashboard*/
  fixedLayout?: boolean;
}

interface CompareData {
  title?: string;
  content?: string;
  name?: string;
  ratio?: number;
  account?: string;
  password?: string;
  min_bet?: number;
  max_bet?: number;
  new_flg?: boolean;
}

const DataTable = <TData, TValue>({
  columns,
  data,
  originalData,
  title = "",
  expandedRowId,
  enableRowSelection = false,
  selectedRowIds = {},
  span = 0,
  onSelectionChange,
  canEditRow,
  canDeleteRow,
  canDeleteSelectRow,
  canDeleteAllRow,
  getRowId,
  renderExpandedRow,
  onAllEdit,
  onSelectEdit,
  onSingleEdit,
  onAllDelete,
  onSelectDelete,
  onSingleDelete,
  fixedLayout = false,
}: DataTableProps<TData, TValue>) => {
  const allRowIds = React.useMemo(() => {
    if (!getRowId) return [];
    return data.map((row) => getRowId(row));
  }, [data, getRowId]);
  const activeSelectedIds = React.useMemo(() => {
    return allRowIds.filter((id) => !!selectedRowIds[id]);
  }, [allRowIds, selectedRowIds]);
  const hasSelection = activeSelectedIds.length > 0;
  const isAllSelected =
    allRowIds.length > 0 && activeSelectedIds.length === allRowIds.length;
  const isSomeSelected = hasSelection && !isAllSelected;
  const isRowModified = React.useCallback(
    (row: TData): boolean => {
      const item = row as unknown as CompareData;
      if (item.new_flg) return false;
      const id = getRowId?.(row);
      if (id === undefined) return false;
      const original = originalData?.find(
        (orig) => getRowId?.(orig) === id,
      ) as unknown as CompareData;
      if (!original) return false;
      return (
        (item.title ?? "") !== (original.title ?? "") ||
        (item.content ?? "") !== (original.content ?? "") ||
        (item.name ?? "") !== (original.name ?? "") ||
        (item.ratio ? parseFloat(Number(item.ratio).toFixed(2)) : "") !==
          (original.ratio
            ? parseFloat(Number(original.ratio).toFixed(2))
            : "") ||
        (item.account ?? "") !== (original.account ?? "") ||
        (item.password ?? "") !== (original.password ?? "") ||
        (item.min_bet ?? "") !== (original.min_bet ?? "") ||
        (item.max_bet ?? "") !== (original.max_bet ?? "")
      );
    },
    [originalData, getRowId],
  );
  const toggleAllRows = React.useCallback(() => {
    if (!onSelectionChange) return;
    const next: Record<string | number, boolean> = {};
    if (!isAllSelected) {
      allRowIds.forEach((id) => {
        next[id] = true;
      });
    }
    data.forEach((row) => {
      const id = getRowId?.(row);
      if (id !== undefined && isRowModified(row)) {
        next[id] = true;
      }
    });
    onSelectionChange(next);
  }, [
    onSelectionChange,
    isAllSelected,
    allRowIds,
    data,
    getRowId,
    isRowModified,
  ]);
  const toggleRow = React.useCallback(
    (id: string | number) => {
      onSelectionChange?.({
        ...selectedRowIds,
        [id]: !selectedRowIds[id],
      });
    },
    [onSelectionChange, selectedRowIds],
  );
  const handleAllEdit = React.useCallback(() => {
    if (!onAllEdit || !getRowId || !onSelectionChange) return;
    const selectedRows = data.filter((row) => {
      const id = getRowId(row);
      return selectedRowIds[id];
    });
    if (selectedRows.length === 0) return;
    onAllEdit(selectedRows);
  }, [onAllEdit, getRowId, onSelectionChange, data, selectedRowIds]);
  const handleSelectEdit = React.useCallback(() => {
    if (!onSelectEdit || !getRowId || !onSelectionChange) return;
    const selectedRows = data.filter((row) => {
      const id = getRowId(row);
      return selectedRowIds[id];
    });
    if (selectedRows.length === 0) return;
    onSelectEdit(selectedRows);
  }, [onSelectEdit, getRowId, onSelectionChange, data, selectedRowIds]);
  const handleSingleEdit = React.useCallback(
    (row: TData) => {
      if (!onSingleEdit || !getRowId || !onSelectionChange) return;
      onSingleEdit(row);
    },
    [onSingleEdit, getRowId, onSelectionChange],
  );
  const handleAllDelete = React.useCallback(() => {
    if (!onAllDelete || !getRowId || !onSelectionChange) return;
    const selectedRows = data.filter((row) => {
      const id = getRowId(row);
      return selectedRowIds[id];
    });
    if (selectedRows.length === 0) return;
    onAllDelete(selectedRows);
    onSelectionChange({});
  }, [onAllDelete, getRowId, onSelectionChange, data, selectedRowIds]);
  const handleSelectDelete = React.useCallback(() => {
    if (!onSelectDelete || !getRowId || !onSelectionChange) return;
    const selectedRows = data.filter((row) => {
      const id = getRowId(row);
      return selectedRowIds[id];
    });
    if (selectedRows.length === 0) return;
    onSelectDelete(selectedRows);
    onSelectionChange({});
  }, [onSelectDelete, getRowId, onSelectionChange, data, selectedRowIds]);
  const handleSingleDelete = React.useCallback(
    (row: TData) => {
      if (!onSingleDelete || !getRowId || !onSelectionChange) return;
      onSingleDelete(row);
      const rowId = getRowId?.(row);
      if (rowId !== undefined) {
        const nextSelection = { ...selectedRowIds };
        delete nextSelection[rowId];
        onSelectionChange(nextSelection);
      }
    },
    [onSingleDelete, getRowId, onSelectionChange, selectedRowIds],
  );
  const hasExistingRows = React.useMemo(() => {
    return data.some((row) => {
      const item = row as unknown as CompareData;
      return !item.new_flg;
    });
  }, [data]);
  const hasExistingSelectedTwoOrMoreRow = React.useMemo(() => {
    const selectedIds = Object.entries(selectedRowIds)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);
    const existingSelectedRows = data.filter((row) => {
      const id = getRowId?.(row);
      const item = row as unknown as CompareData;
      return (
        id !== undefined && selectedIds.includes(String(id)) && !item.new_flg
      );
    });
    return existingSelectedRows.length >= 2;
  }, [data, selectedRowIds, getRowId]);
  const hasExistingDeleteTwoOrMoreRow = React.useMemo(() => {
    const selectedIds = Object.entries(selectedRowIds)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);
    const existingSelectedRows = data.filter((row) => {
      const id = getRowId?.(row);
      return id !== undefined && selectedIds.includes(String(id));
    });
    return existingSelectedRows.length >= 2;
  }, [data, selectedRowIds, getRowId]);
  const isAllDisabled = React.useMemo(() => {
    return data.length === 0 || data.every((row) => isRowModified(row));
  }, [data, isRowModified]);
  const actionColumn = React.useMemo(
    (): ColumnDef<TData> => ({
      id: "select",
      size: 50,
      header: ({ table }) => {
        const disabled = table.options.meta?.isAllDisabled ?? false;
        return (
          <div className="flex items-center gap-2 justify-center h-4">
            <CheckboxField
              id="select-all"
              checked={isAllSelected}
              indeterminate={isSomeSelected}
              onCheckedChange={toggleAllRows}
              disabled={disabled}
              className="p-0"
              checkboxClassName="mt-0"
            />
            <div className="w-5">
              {isAllSelected && (
                <RowActions
                  canEditAllRow={hasExistingRows}
                  canDeleteRow={canDeleteRow}
                  canDeleteSelectRow={canDeleteSelectRow}
                  canDeleteAllRow={canDeleteAllRow}
                  onAllEdit={handleAllEdit}
                  onAllDelete={handleAllDelete}
                />
              )}
            </div>
          </div>
        );
      },
      cell: ({ row }) => {
        const rowId = getRowId?.(row.original);
        if (rowId === undefined) return null;
        const modified = isRowModified(row.original);
        const locked = modified;
        const checked = locked ? true : !!selectedRowIds[rowId];
        const canEditThisRow = canEditRow ? canEditRow(row.original) : true;
        return (
          <div className="flex items-center gap-2 justify-center h-4">
            <CheckboxField
              id={`row-${rowId}`}
              checked={checked}
              disabled={locked}
              onCheckedChange={() => toggleRow(rowId)}
              checkboxClassName="mt-0"
            />
            <div className="w-5">
              {checked && (
                <RowActions
                  canEditRow={canEditThisRow}
                  canDeleteRow={canDeleteRow}
                  canDeleteSelectRow={canDeleteSelectRow}
                  canDeleteAllRow={canDeleteAllRow}
                  hasSelectedTwoOrMoreRow={hasExistingSelectedTwoOrMoreRow}
                  hasDeleteTwoOrMoreRow={hasExistingDeleteTwoOrMoreRow}
                  onSelectEdit={handleSelectEdit}
                  onSingleEdit={() => handleSingleEdit(row.original)}
                  onSelectDelete={handleSelectDelete}
                  onSingleDelete={() => handleSingleDelete(row.original)}
                />
              )}
            </div>
          </div>
        );
      },
    }),
    [
      isAllSelected,
      isSomeSelected,
      toggleAllRows,
      hasExistingRows,
      hasExistingSelectedTwoOrMoreRow,
      hasExistingDeleteTwoOrMoreRow,
      canEditRow,
      canDeleteRow,
      canDeleteSelectRow,
      canDeleteAllRow,
      getRowId,
      isRowModified,
      selectedRowIds,
      toggleRow,
      handleAllEdit,
      handleAllDelete,
      handleSelectEdit,
      handleSelectDelete,
      handleSingleEdit,
      handleSingleDelete,
    ],
  );
  const finalColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;
    return [actionColumn, ...columns];
  }, [enableRowSelection, columns, actionColumn]);
  const { t } = useTranslation();
  const table = useReactTable({
    data,
    columns: finalColumns,
    state: {
      rowSelection: React.useMemo(() => {
        const res: RowSelectionState = {};
        Object.entries(selectedRowIds).forEach(([k, v]) => {
          if (v) res[k] = true;
        });
        return res;
      }, [selectedRowIds]),
    },
    meta: {
      isAllDisabled,
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      {title !== "" && (
        <div className="bg-neutral-900 text-white text-center py-2 font-medium">
          {title}
        </div>
      )}
      <Table
        className={
          fixedLayout
            ? "w-full border-collapse table-fixed"
            : "w-full border-collapse min-w-max"
        }
        style={fixedLayout ? { tableLayout: "fixed" } : undefined}
      >
        <TableHeader className={title !== "" ? "" : "bg-black"}>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.column.columnDef.size
                        ? header.getSize() + "px"
                        : header.getSize(),
                    }}
                    className={
                      title !== "" ? "text-center" : "text-center text-white"
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const rowId = getRowId?.(row.original);
              const isExpanded =
                expandedRowId !== undefined &&
                rowId !== undefined &&
                (Array.isArray(expandedRowId)
                  ? expandedRowId.includes(Number(rowId))
                  : expandedRowId === rowId);
              return (
                <React.Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{
                          width: cell.column.columnDef.size
                            ? cell.column.getSize() + "px"
                            : cell.column.getSize(),
                          ...(fixedLayout && cell.column.columnDef.size
                            ? { maxWidth: cell.column.getSize() + "px" }
                            : {}),
                        }}
                        className={
                          fixedLayout
                            ? "text-center break-words overflow-wrap-anywhere leading-relaxed overflow-hidden align-top whitespace-normal"
                            : "text-center break-words overflow-wrap-anywhere leading-relaxed"
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded && renderExpandedRow && (
                    <TableRow>
                      <TableCell
                        colSpan={span ? span : columns.length}
                        className="p-4 bg-gray-50"
                      >
                        {renderExpandedRow(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={span ? span : columns.length}
                className="h-12 text-center"
              >
                {t("no_data")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;
