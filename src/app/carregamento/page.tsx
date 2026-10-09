"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, RotateCcw } from "lucide-react";
import { BusLoader } from "@/components/dashboard/BusLoader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Prévia da tela de carregamento dos painéis, sem Power BI por trás: a viagem
 * continua até alguém clicar em "Simular relatório carregado".
 */
export default function LoadingPreviewPage() {
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"loading" | "arriving" | "fading" | "done">("loading");

  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => setPhase("done"), 320);
    return () => clearTimeout(t);
  }, [phase]);

  function restart() {
    setPhase("loading");
    setRun((n) => n + 1);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
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
          <Button size="sm" variant="outline" onClick={restart}>
            <RotateCcw />
            <span className="hidden sm:inline">Recomeçar</span>
          </Button>
        </div>
      </header>

      <main className="relative flex-1">
        {phase === "done" ? (
          <div className="flex h-full min-h-[60dvh] animate-view-in flex-col items-center justify-center gap-2 text-center">
            <p className="font-display text-lg font-semibold">Aqui entraria o relatório.</p>
            <p className="text-sm text-muted-foreground">Clique em Recomeçar para ver a viagem de novo.</p>
          </div>
        ) : (
          <div
            key={run}
            className={cn(
              "absolute inset-0 transition-opacity [transition-duration:300ms]",
              phase === "fading" && "opacity-0"
            )}
          >
            <BusLoader
              arriving={phase === "arriving" || phase === "fading"}
              onDone={() => setPhase((p) => (p === "arriving" ? "fading" : p))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
