"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Maximize2, Minimize2, RotateCw } from "lucide-react";
import { PowerBIFrame } from "./PowerBIFrame";
import { ExportBancoHorasDialog } from "./ExportBancoHorasDialog";
import { ReportSkeleton } from "./ReportSkeleton";
import { ForbiddenState, LoadErrorState } from "@/components/empty/states";
import { APP_TIME_ZONE } from "@/lib/utils";
import { BANCO_HORAS_SLUG } from "@/lib/bancoHoras/filters";

interface DashboardShellProps {
  slug: string;
  /** Nome do painel (null se o slug não existir). */
  label: string | null;
}

type ShellState =
  | { status: "loading" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; embedUrl: string };

const iconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors [transition-duration:200ms] hover:bg-secondary hover:text-foreground active:scale-[.975] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function timeNow() {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Busca a URL de embed no servidor (/api/embed-url) e mostra o relatório
 * dentro da moldura (cabeçalho fino + iframe).
 */
export function DashboardShell({ slug, label }: DashboardShellProps) {
  const [state, setState] = useState<ShellState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setOpenedAt(null);

    fetch(`/api/embed-url?pageSlug=${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403 || res.status === 404) {
          setState({ status: "forbidden" });
          return;
        }
        if (!res.ok) {
          setState({ status: "error" });
          return;
        }
        const { embedUrl } = (await res.json()) as { embedUrl: string };
        if (!cancelled) setState({ status: "ready", embedUrl });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, attempt]);

  useEffect(() => {
    // O iPhone não permite tela cheia de elementos comuns: escondemos o botão.
    setCanFullscreen(!!document.fullscreenEnabled);
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleLoaded = useCallback(() => setOpenedAt(timeNow()), []);

  function reload() {
    setOpenedAt(null);
    setReloadKey((k) => k + 1);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else frameRef.current?.requestFullscreen();
  }

  if (state.status === "forbidden") return <ForbiddenState label={label} />;
  if (state.status === "error") return <LoadErrorState onRetry={() => setAttempt((a) => a + 1)} />;

  const name = label ?? slug;

  return (
    <div ref={frameRef} className="flex h-full animate-view-in flex-col bg-background">
      <header className="flex h-[52px] shrink-0 items-center gap-3 border-b bg-gradient-to-b from-background to-[#2A2A2A] pl-4 pr-2 sm:pl-5">
        <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h1 className="truncate text-[14.5px] font-semibold">{name}</h1>
          <span className="hidden shrink-0 text-[12.5px] text-tertiary sm:inline">
            · {openedAt ? `aberto às ${openedAt}` : "carregando…"}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {slug === BANCO_HORAS_SLUG && (
            <button
              type="button"
              onClick={() => {
                // O modal abre fora da moldura: em tela cheia ficaria invisível.
                if (document.fullscreenElement) document.exitFullscreen();
                setExportOpen(true);
              }}
              disabled={state.status !== "ready"}
              title="Exportar para Excel"
              className="mr-1.5 flex h-8 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/[.08] px-2.5 text-[12.5px] font-medium text-primary transition-colors [transition-duration:200ms] hover:bg-primary/[.16] active:scale-[.975] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sr-only sm:hidden">Exportar para Excel</span>
            </button>
          )}
          <button
            type="button"
            onClick={reload}
            disabled={state.status !== "ready"}
            aria-label="Recarregar painel"
            title="Recarregar"
            className={`${iconButtonClass} disabled:opacity-40`}
          >
            <RotateCw className="h-4 w-4" />
          </button>
          {canFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className={iconButtonClass}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {state.status === "ready" ? (
          <PowerBIFrame key={reloadKey} src={state.embedUrl} title={name} onLoaded={handleLoaded} />
        ) : (
          <ReportSkeleton />
        )}
      </div>

      {slug === BANCO_HORAS_SLUG && <ExportBancoHorasDialog open={exportOpen} onOpenChange={setExportOpen} />}
    </div>
  );
}
