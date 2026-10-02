import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { describeFilters } from "@/lib/bancoHoras/filters";
import { formatDateTimeBR } from "@/lib/utils";
import type { ExportLogEntry } from "@/lib/bancoHoras/audit";

const ACTION_LABEL: Record<ExportLogEntry["action"], string> = {
  export: "Exportação",
  options: "Abrir filtros",
  diagnostic: "Teste de conexão",
};

const STATUS: Record<ExportLogEntry["status"], { label: string; variant: "default" | "info" | "destructive" }> = {
  ok: { label: "ok", variant: "default" },
  empty: { label: "sem dados", variant: "info" },
  error: { label: "erro", variant: "destructive" },
  denied: { label: "negado", variant: "destructive" },
};

function result(entry: ExportLogEntry) {
  if (entry.status === "ok" && entry.action === "export") {
    return `${entry.row_count?.toLocaleString("pt-BR") ?? 0} linha(s)${entry.error_code === "LIMITADO" ? " (limitado)" : ""}`;
  }
  if (entry.status === "empty") return "0 linhas";
  return entry.error_code ?? "";
}

export function ExportLogTable({ entries }: { entries: ExportLogEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma exportação ou teste registrado ainda.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">Quando</TableHead>
          <TableHead>Quem</TableHead>
          <TableHead>O quê</TableHead>
          <TableHead className="hidden md:table-cell">Filtros</TableHead>
          <TableHead>Resultado</TableHead>
          <TableHead className="hidden pr-5 text-right sm:table-cell">Tempo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((e) => (
          <TableRow key={e.id} className="align-top">
            <TableCell className="whitespace-nowrap pl-5 tabular-nums text-muted-foreground">
              {formatDateTimeBR(e.created_at)}
            </TableCell>
            <TableCell className="max-w-[180px] truncate">{e.user_email ?? "—"}</TableCell>
            <TableCell className="whitespace-nowrap">{ACTION_LABEL[e.action]}</TableCell>
            <TableCell className="hidden max-w-[260px] text-[13px] text-muted-foreground md:table-cell">
              {e.action === "export" && e.filters ? describeFilters(e.filters) : "—"}
            </TableCell>
            <TableCell className="max-w-[320px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={STATUS[e.status].variant}>{STATUS[e.status].label}</Badge>
                <span className="font-mono text-[11.5px] text-muted-foreground">{result(e)}</span>
              </div>
              {e.error_detail && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[12px] text-tertiary hover:text-muted-foreground">detalhe técnico</summary>
                  <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground">{e.error_detail}</p>
                </details>
              )}
            </TableCell>
            <TableCell className="hidden whitespace-nowrap pr-5 text-right tabular-nums text-tertiary sm:table-cell">
              {e.duration_ms !== null ? `${(e.duration_ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s` : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
