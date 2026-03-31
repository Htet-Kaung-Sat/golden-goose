import ExcelJS from "exceljs";

export interface ExportColumn<T> {
  header: string;
  accessor: keyof T & string;
  format?: (value: T[keyof T], row: T) => string | number;
  width?: number;
  numFmt?: string;
  color?: string | ((value: T[keyof T], row: T) => string);
}

export interface ExportTable<T = object> {
  title?: string;
  columns: readonly ExportColumn<T>[];
  data: readonly T[];
}

export interface ExportSingleSheetOptions {
  fileName: string;
  startDate?: string;
  endDate?: string;
  lang: string;
  mode?: "single" | "multi";
  fileType: string;
  gridFlg: boolean;
}

function renderTableToWorksheet(
  worksheet: ExcelJS.Worksheet,
  table: ExportTable<object>,
  options: ExportSingleSheetOptions,
  startRow = 1,
  showDate = true
) {
  const COL_OFFSET = 2;
  let currentRow = startRow;
  const baseWidth = options.lang === "en" ? 22 : 18;

  if (showDate && (options.startDate || options.endDate)) {
    const dateCell = worksheet.getCell(currentRow, COL_OFFSET);
    dateCell.value = `${options.startDate ?? ""} ~ ${options.endDate ?? ""}`;
    dateCell.font = { bold: true };
    currentRow += 2;
  }

  if (table.title) {
    const colCount = table.columns.length;
    const startCol = COL_OFFSET;
    const endCol = COL_OFFSET + colCount - 1;
    worksheet.mergeCells(currentRow, startCol, currentRow, endCol);
    const titleCell = worksheet.getCell(currentRow, startCol);
    titleCell.value = table.title;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF000000" },
    };
    titleCell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    currentRow++;
  }

  const headerRow = worksheet.getRow(currentRow);
  table.columns.forEach((col, index) => {
    const cell = headerRow.getCell(COL_OFFSET + index);
    cell.value = col.header;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  currentRow++;

  table.data.forEach((rowData) => {
    const dataRow = worksheet.getRow(currentRow);
    table.columns.forEach((col, index) => {
      const cell = dataRow.getCell(COL_OFFSET + index);
      const value = (rowData as Record<string, unknown>)[col.accessor];

      const formattedValue = col.format
        ? col.format(value as never, rowData)
        : (value as string | number);

      cell.value = formattedValue;
      if (col.numFmt) {
        cell.numFmt = col.numFmt;
      }
      if (col.color) {
        let argbColor = "";
        if (typeof col.color === "function") {
          argbColor = col.color(value as never, rowData);
        } else {
          argbColor = col.color;
        }
        if (argbColor) {
          cell.font = {
            ...cell.font,
            color: { argb: argbColor },
          };
        }
      }
      if (typeof formattedValue === "string" && formattedValue.includes("\n")) {
        cell.alignment = { wrapText: true, vertical: "top" };
      }
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    dataRow.height = undefined as unknown as number;
    currentRow++;
  });
  worksheet.getColumn(1).width = 4;
  table.columns.forEach((tableCol, index) => {
    const excelCol = worksheet.getColumn(COL_OFFSET + index);
    const targetWidth = tableCol?.width ? tableCol.width : baseWidth;
    excelCol.width = targetWidth;
  });
  return currentRow + 2;
}

async function saveWorkbook(
  workbook: ExcelJS.Workbook,
  fileName: string,
  fieldType: string
) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${fileName}.${fieldType}`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function exportExcel<T extends ExportTable<object>>(
  options: ExportSingleSheetOptions,
  tables: T[]
) {
  const workbook = new ExcelJS.Workbook();
  const mode = options.mode ?? "single";

  if (mode === "single") {
    const worksheet = workbook.addWorksheet(options.fileName.split("_")[1], {
      views: [{ showGridLines: options.gridFlg }],
    });

    let currentRow = 1;
    if (options.startDate || options.endDate) {
      const dateCell = worksheet.getCell(currentRow, 2);
      dateCell.value = `${options.startDate ?? ""} 
      ${options.endDate ? "~" : ""} 
      ${options.endDate ?? ""}`;
      dateCell.font = { bold: true };
      currentRow += 2;
    }
    tables.forEach((table) => {
      currentRow = renderTableToWorksheet(
        worksheet,
        table,
        options,
        currentRow,
        false
      );
    });
  } else {
    tables.forEach((table, index) => {
      const sheetName = table.title?.slice(0, 31) || `Sheet ${index + 1}`;
      const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: options.gridFlg }],
      });
      renderTableToWorksheet(worksheet, table, options, 1, true);
    });
  }
  await saveWorkbook(workbook, options.fileName, options.fileType);
}
