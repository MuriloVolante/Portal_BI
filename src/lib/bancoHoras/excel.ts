import "server-only";
import ExcelJS from "exceljs";
import { APP_TIME_ZONE } from "@/lib/utils";
import type { BancoHorasFilters } from "./filters";
import type { BancoHorasRow } from "./source";

const HEADER_FILL = "FF2D2D2D";
const HEADER_FONT = "FFF2F2F2";
const ACCENT = "FF96D737";

interface BuildOptions {
  columns: string[];
  rows: BancoHorasRow[];
  filters: BancoHorasFilters;
  generatedBy: string;
  truncated: boolean;
}

function formatFilters(filters: BancoHorasFilters) {
  const parts = [
    `Gerência: ${filters.gerencia ?? "todas"}`,
    `Saldo mínimo: ${filters.saldoMin === null ? "sem mínimo" : `${filters.saldoMin.toLocaleString("pt-BR")} h`}`,
  ];
  return parts.join("   ·   ");
}

/** Planilha com cabeçalho de contexto (filtros, data, quem gerou) + tabela filtrável. */
export async function buildBancoHorasWorkbook({
  columns,
  rows,
  filters,
  generatedBy,
  truncated,
}: BuildOptions): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Portal BI";
  wb.created = new Date();

  const ws = wb.addWorksheet("Banco de Horas", {
    views: [{ state: "frozen", ySplit: 5 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const lastCol = Math.max(columns.length, 1);
  const generatedAt = new Date().toLocaleString("pt-BR", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  });

  // Linhas 1–3: contexto da exportação.
  ws.mergeCells(1, 1, 1, lastCol);
  ws.getCell(1, 1).value = "Banco de Horas";
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.mergeCells(2, 1, 2, lastCol);
  ws.getCell(2, 1).value = formatFilters(filters);
  ws.getCell(2, 1).font = { color: { argb: "FF595959" } };
  ws.mergeCells(3, 1, 3, lastCol);
  ws.getCell(3, 1).value =
    `Gerado em ${generatedAt} por ${generatedBy} · ${rows.length.toLocaleString("pt-BR")} registro(s)` +
    (truncated ? " · LIMITADO: refine os filtros para ver todos" : "");
  ws.getCell(3, 1).font = { color: { argb: truncated ? "FFC00000" : "FF595959" }, size: 9 };

  // Linha 5: cabeçalho da tabela.
  const headerRowIndex = 5;
  const header = ws.getRow(headerRowIndex);
  columns.forEach((name, i) => {
    const cell = header.getCell(i + 1);
    cell.value = name;
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.border = { bottom: { style: "medium", color: { argb: ACCENT } } };
    cell.alignment = { vertical: "middle" };
  });
  header.height = 22;

  // Dados: números continuam números (somar/filtrar no Excel funciona).
  const numericCols = new Set(
    columns.filter((c) => rows.some((r) => typeof r[c] === "number") && rows.every((r) => r[c] === null || typeof r[c] === "number"))
  );
  rows.forEach((row, r) => {
    const excelRow = ws.getRow(headerRowIndex + 1 + r);
    columns.forEach((c, i) => {
      excelRow.getCell(i + 1).value = row[c] ?? null;
    });
  });

  columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    const longest = Math.max(
      c.length,
      ...rows.slice(0, 2000).map((r) => {
        const v = r[c];
        return v instanceof Date ? 16 : v === null || v === undefined ? 0 : String(v).length;
      })
    );
    col.width = Math.min(Math.max(longest + 3, 10), 48);
    if (numericCols.has(c) && /saldo|hora/i.test(c)) col.numFmt = "#,##0.00;[Red]-#,##0.00";
    if (rows.some((r) => r[c] instanceof Date)) col.numFmt = "dd/mm/yyyy";
  });

  if (columns.length) {
    ws.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex + rows.length, column: columns.length },
    };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
