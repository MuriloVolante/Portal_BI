"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, RefreshCw, RotateCcw } from "lucide-react";
import { BusLoader } from "@/components/dashboard/BusLoader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Phase = "loading" | "arriving" | "fading" | "done";

/** Relatório de mentira, só para ver a entrada do ônibus por cima dele. */
function FakeReport() {
  const bars = [42, 58, 51, 66, 72, 61, 80, 74, 88, 69, 77, 92];
  return (
    <div className="grid h-full gap-4 overflow-hidden bg-white p-5 text-[#252423] sm:p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Headcount", "1.248"],
          ["Admissões no mês", "37"],
          ["Turnover", "2,1%"],
          ["Saldo médio BH", "18,4 h"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-[#E1DFDD] p-4">
            <p className="text-xs text-[#605E5C]">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex min-h-[200px] items-end gap-2 rounded-md border border-[#E1DFDD] p-4">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-[#118DFF]" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Prévia da tela de carregamento dos painéis, sem Power BI por trás: a viagem
 * continua até alguém clicar em "Simular relatório carregado".
 */
export default function LoadingPreviewPage() {
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  /** true = recarregar (ônibus entra por cima do relatório). */
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => setPhase("done"), 320);
    return () => clearTimeout(t);
  }, [phase]);

  function start(withIntro: boolean) {
    setIntro(withIntro);
    setPhase("loading");
    setRun((n) => n + 1);
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b px-4 sm:px-5">
        <Link
          href="/"
          aria-label="Voltar ao portal"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="truncate text-[14.5px] font-semibold">Tela de carregamento · prévia</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => setPhase("arriving")} disabled={phase !== "loading"}>
            <Play />
            <span className="hidden sm:inline">Simular relatório carregado</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => start(true)} disabled={phase !== "done"}>
            <RefreshCw />
            <span className="hidden sm:inline">Simular recarregar</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => start(false)}>
            <RotateCcw />
            <span className="hidden sm:inline">Recomeçar</span>
          </Button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        {(phase === "done" || intro) && <FakeReport />}
        {phase !== "done" && (
          <div
            key={run}
            className={cn(
              "absolute inset-0 transition-opacity [transition-duration:300ms]",
              !intro && "bg-background",
              phase === "fading" && "opacity-0"
            )}
          >
            <BusLoader
              intro={intro}
              arriving={phase === "arriving" || phase === "fading"}
              onDone={() => setPhase((p) => (p === "arriving" ? "fading" : p))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
