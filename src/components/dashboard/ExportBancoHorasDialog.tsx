"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SELECT_FILTERS,
  bancoHorasQueryString,
  type BancoHorasOptions,
  type SelectFilterKey,
} from "@/lib/bancoHoras/filters";

interface ExportBancoHorasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Erro vindo da API: admin recebe também o que fazer e o detalhe técnico. */
interface ApiError {
  error: string;
  code?: string;
  hint?: string;
  detail?: string;
}

type OptionsState =
  | { status: "loading" }
  | { status: "ready"; options: BancoHorasOptions }
  | { status: "error"; problem: ApiError };

const EMPTY_SELECTION: Record<SelectFilterKey, string> = { cargo: "", filial: "", gerencia: "", local: "" };

function filenameFrom(res: Response) {
  const match = /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") ?? "");
  return match?.[1] ?? "banco-horas.xlsx";
}

async function readProblem(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ApiError;
    if (body.error) return body;
  } catch {
    // resposta sem JSON
  }
  return { error: "Não foi possível gerar a planilha. Tente de novo." };
}

function ProblemMessage({ problem }: { problem: ApiError }) {
  return (
    <div className="animate-rise-in space-y-1.5 rounded-lg border border-destructive/35 bg-destructive/[.07] p-3 text-sm" role="alert">
      <p className="text-destructive">
        {problem.error}
        {problem.code && <span className="ml-1.5 font-mono text-[11px] opacity-80">({problem.code})</span>}
      </p>
      {problem.hint && <p className="text-[13px] text-muted-foreground">{problem.hint}</p>}
      {problem.hint && (
        <Link href="/admin/banco-horas" className="inline-block text-[13px] text-primary underline-offset-4 hover:underline">
          Abrir o teste de conexão
        </Link>
      )}
    </div>
  );
}

const selectClass =
  "flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm transition-[border-color,box-shadow] [transition-duration:200ms] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50";

/** Filtros da exportação → /api/banco-horas/export → download do .xlsx. */
export function ExportBancoHorasDialog({ open, onOpenChange }: ExportBancoHorasDialogProps) {
  const [optionsState, setOptionsState] = useState<OptionsState>({ status: "loading" });
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [saldoMin, setSaldoMin] = useState("");
  const [exporting, setExporting] = useState(false);
  const [problem, setProblem] = useState<ApiError | null>(null);

  // Busca as opções na primeira abertura (e de novo se tiver falhado).
  useEffect(() => {
    if (!open || optionsState.status === "ready") return;
    let cancelled = false;
    setOptionsState({ status: "loading" });
    fetch("/api/banco-horas/opcoes")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setOptionsState({ status: "error", problem: await readProblem(res) });
          return;
        }
        const { options } = (await res.json()) as { options: BancoHorasOptions };
        if (!cancelled) setOptionsState({ status: "ready", options });
      })
      .catch(() => {
        if (!cancelled) setOptionsState({ status: "error", problem: { error: "Sem conexão com o servidor." } });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) setProblem(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProblem(null);

    const saldo = saldoMin.trim().replace(",", ".");
    if (saldo !== "" && !Number.isFinite(Number(saldo))) {
      setProblem({ error: "Informe o saldo mínimo em horas (ex.: 40 ou 12,5)." });
      return;
    }

    setExporting(true);
    try {
      const qs = bancoHorasQueryString({
        cargo: selection.cargo || null,
        filial: selection.filial || null,
        gerencia: selection.gerencia || null,
        local: selection.local || null,
        saldoMin: saldo === "" ? null : Number(saldo),
      });
      const res = await fetch(`/api/banco-horas/export${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        setProblem(await readProblem(res));
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFrom(res);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onOpenChange(false);
    } catch {
      setProblem({ error: "Sem conexão com o servidor. Tente de novo." });
    } finally {
      setExporting(false);
    }
  }

  const optionsReady = optionsState.status === "ready";

  return (
    <Dialog open={open} onOpenChange={(next) => !exporting && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar banco de horas</DialogTitle>
          <DialogDescription>
            Gera uma planilha Excel com os colaboradores que atendem aos filtros.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {SELECT_FILTERS.map(({ key, label, all }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`bh-${key}`}>{label}</Label>
                <div className="relative">
                  <select
                    id={`bh-${key}`}
                    value={selection[key]}
                    onChange={(e) => setSelection((s) => ({ ...s, [key]: e.target.value }))}
                    disabled={!optionsReady || exporting}
                    className={selectClass}
                  >
                    <option value="">{optionsState.status === "loading" ? "Carregando…" : all}</option>
                    {optionsReady &&
                      optionsState.options[key].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bh-saldo">Saldo maior ou igual a (horas)</Label>
            <Input
              id="bh-saldo"
              type="text"
              inputMode="decimal"
              placeholder="Sem mínimo (ex.: 40 ou 12,5)"
              value={saldoMin}
              onChange={(e) => setSaldoMin(e.target.value)}
              disabled={exporting}
            />
          </div>

          {optionsState.status === "error" && <ProblemMessage problem={optionsState.problem} />}
          {problem && <ProblemMessage problem={problem} />}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={exporting || !optionsReady}>
              {exporting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              {exporting ? "Gerando…" : "Exportar Excel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
