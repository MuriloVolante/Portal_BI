"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardCopy, Loader2, Minus, PlugZap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTimeBR } from "@/lib/utils";
import type { DiagnosticReport } from "@/lib/bancoHoras/diagnostics";

const STATUS_ICON = {
  ok: { icon: Check, className: "bg-primary/15 text-primary" },
  fail: { icon: X, className: "bg-destructive/15 text-destructive" },
  skipped: { icon: Minus, className: "bg-secondary text-tertiary" },
} as const;

/** Texto para colar no chamado da TI: tudo o que foi testado, sem senha. */
function reportText(r: DiagnosticReport) {
  return [
    `Teste de conexão Portal BI → SQL Server (${formatDateTimeBR(r.ranAt)})`,
    `Destino: ${r.target.server ?? "?"}:${r.target.port} · banco ${r.target.database ?? "?"} · usuário ${r.target.user ?? "?"} · view ${r.target.view}`,
    `Origem: Vercel região ${r.origin.region} · IP público de saída ${r.origin.publicIp ?? "não identificado"} (muda a cada execução)`,
    "",
    ...r.steps.map((s) => `[${s.status === "ok" ? "OK" : s.status === "fail" ? "FALHOU" : "—"}] ${s.label}${s.ms !== null ? ` (${s.ms} ms)` : ""}: ${s.detail}`),
    "",
    r.diagnosis
      ? `Diagnóstico (${r.diagnosis.code}): ${r.diagnosis.title}\nO que fazer: ${r.diagnosis.hint}\nDetalhe técnico: ${r.diagnosis.detail}`
      : "Diagnóstico: conexão e leitura funcionando.",
  ].join("\n");
}

export function SqlConnectionTest() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/banco-horas/diagnostico", { method: "POST" });
      if (!res.ok) {
        setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `Erro ${res.status}`);
        return;
      }
      setReport((await res.json()) as DiagnosticReport);
      router.refresh(); // o teste entra no histórico abaixo
    } catch {
      setError("Sem conexão com o servidor do portal.");
    } finally {
      setRunning(false);
    }
  }

  async function copy() {
    if (!report) return;
    await navigator.clipboard.writeText(reportText(report));
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <PlugZap />}
          {running ? "Testando… (até 30 s)" : "Testar conexão"}
        </Button>
        {report && (
          <Button variant="outline" onClick={copy}>
            {copied ? <Check /> : <ClipboardCopy />}
            {copied ? "Copiado" : "Copiar relatório para a TI"}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {report && (
        <div className="animate-rise-in space-y-4">
          <ol className="space-y-2">
            {report.steps.map((step) => {
              const { icon: Icon, className } = STATUS_ICON[step.status];
              return (
                <li key={step.id} className="flex gap-3">
                  <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", className)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", step.status === "skipped" && "text-tertiary")}>
                      {step.label}
                      {step.ms !== null && <span className="ml-2 text-xs font-normal tabular-nums text-tertiary">{step.ms} ms</span>}
                    </p>
                    <p className="break-words text-[13px] text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {report.diagnosis ? (
            <div className="space-y-2 rounded-xl border border-destructive/35 bg-destructive/[.07] p-4">
              <p className="text-sm font-semibold text-destructive">
                {report.diagnosis.title} <span className="font-mono text-[11px] font-normal opacity-80">({report.diagnosis.code})</span>
              </p>
              <p className="text-[13px]">{report.diagnosis.hint}</p>
              <p className="break-words font-mono text-[11.5px] text-muted-foreground">{report.diagnosis.detail}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-primary/35 bg-primary/[.07] p-4 text-sm text-primary">
              Conexão e leitura funcionando.
            </p>
          )}

          <p className="text-xs text-tertiary">
            Saída: Vercel região {report.origin.region} · IP público {report.origin.publicIp ?? "não identificado"} (muda a cada execução)
          </p>
        </div>
      )}
    </div>
  );
}
