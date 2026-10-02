"use client";

import { useEffect, useState } from "react";
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
import { bancoHorasQueryString } from "@/lib/bancoHoras/filters";

interface ExportBancoHorasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GerenciasState =
  | { status: "loading" }
  | { status: "ready"; options: string[] }
  | { status: "error"; message: string };

/** Nome do arquivo vindo do Content-Disposition (com fallback). */
function filenameFrom(res: Response) {
  const match = /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") ?? "");
  return match?.[1] ?? "banco-horas.xlsx";
}

async function errorMessage(res: Response) {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    // resposta sem JSON
  }
  return "Não foi possível gerar a planilha. Tente de novo.";
}

/** Filtros da exportação → /api/banco-horas/export → download do .xlsx. */
export function ExportBancoHorasDialog({ open, onOpenChange }: ExportBancoHorasDialogProps) {
  const [gerencias, setGerencias] = useState<GerenciasState>({ status: "loading" });
  const [gerencia, setGerencia] = useState("");
  const [saldoMin, setSaldoMin] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca as gerências na primeira abertura (e de novo se tiver falhado).
  useEffect(() => {
    if (!open || gerencias.status === "ready") return;
    let cancelled = false;
    setGerencias({ status: "loading" });
    fetch("/api/banco-horas/gerencias")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setGerencias({ status: "error", message: await errorMessage(res) });
          return;
        }
        const { gerencias: options } = (await res.json()) as { gerencias: string[] };
        if (!cancelled) setGerencias({ status: "ready", options });
      })
      .catch(() => {
        if (!cancelled) setGerencias({ status: "error", message: "Sem conexão com o servidor." });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const saldo = saldoMin.trim().replace(",", ".");
    if (saldo !== "" && !Number.isFinite(Number(saldo))) {
      setError("Informe o saldo mínimo em horas (ex.: 40).");
      return;
    }

    setExporting(true);
    try {
      const qs = bancoHorasQueryString({
        gerencia: gerencia || null,
        saldoMin: saldo === "" ? null : Number(saldo),
      });
      const res = await fetch(`/api/banco-horas/export${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        setError(await errorMessage(res));
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
      setError("Sem conexão com o servidor. Tente de novo.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !exporting && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar banco de horas</DialogTitle>
          <DialogDescription>
            Gera uma planilha Excel com os colaboradores que atendem aos filtros.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bh-gerencia">Gerência</Label>
            <div className="relative">
              <select
                id="bh-gerencia"
                value={gerencia}
                onChange={(e) => setGerencia(e.target.value)}
                disabled={gerencias.status !== "ready" || exporting}
                className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm transition-[border-color,box-shadow] [transition-duration:200ms] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {gerencias.status === "loading" ? "Carregando gerências…" : "Todas as gerências"}
                </option>
                {gerencias.status === "ready" &&
                  gerencias.options.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {gerencias.status === "error" && (
              <p className="text-xs text-destructive">{gerencias.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bh-saldo">Saldo mínimo (horas)</Label>
            <Input
              id="bh-saldo"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Sem mínimo"
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={saldoMin}
              onChange={(e) => setSaldoMin(e.target.value)}
              disabled={exporting}
            />
            <p className="text-xs text-muted-foreground">
              Inclui quem tem saldo igual ou maior. Deixe vazio para trazer todos.
            </p>
          </div>

          {error && (
            <p className="animate-rise-in text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={exporting || gerencias.status === "error"}>
              {exporting ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
              {exporting ? "Gerando…" : "Exportar Excel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
