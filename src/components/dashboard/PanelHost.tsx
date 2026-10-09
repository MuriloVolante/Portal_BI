"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "./DashboardShell";
import { cn } from "@/lib/utils";
import type { SidebarPage } from "@/types";

/** Quantos painéis ficam abertos em segundo plano (o menos usado sai). */
const MAX_KEPT = 4;
/** Espera depois que o painel visível carrega, antes de pré-carregar o próximo. */
const PRELOAD_DELAY_MS = 1500;

/**
 * Pré-carregar outros painéis só em computador com conexão boa: no celular
 * gastaria dados e bateria com relatórios que talvez nem sejam abertos.
 */
function canPreload() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData || (conn?.effectiveType && /(^|-)2g|3g/.test(conn.effectiveType))) return false;
  return window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
}

function slugFromPath(pathname: string) {
  const match = /^\/dashboard\/([^/]+)\/?$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Mantém vivos os painéis já abertos: ao voltar para um painel, o Power BI
 * aparece na hora, no mesmo filtro e na mesma página interna. Fica no layout
 * do portal, que não é desmontado ao trocar de painel.
 *
 * Os painéis ficam sempre na mesma ordem no DOM — mover um iframe de lugar
 * faz o navegador recarregá-lo.
 */
interface PanelHostProps {
  pages: SidebarPage[];
  /** slug → link do Power BI, já no HTML (o iframe nasce carregando). */
  embedUrls: Record<string, string>;
  children: React.ReactNode;
}

export function PanelHost({ pages, embedUrls, children }: PanelHostProps) {
  const pathname = usePathname();
  const slug = slugFromPath(pathname);
  const activeSlug = slug && pages.some((p) => p.slug === slug) ? slug : null;

  const [kept, setKept] = useState<string[]>(activeSlug ? [activeSlug] : []);
  const lastUsed = useRef(new Map<string, number>());

  useEffect(() => {
    if (!activeSlug) return;
    lastUsed.current.set(activeSlug, Date.now());
    setKept((prev) => {
      if (prev.includes(activeSlug)) return prev;
      const next = [...prev, activeSlug];
      if (next.length <= MAX_KEPT) return next;
      const oldest = next
        .filter((s) => s !== activeSlug)
        .sort((a, b) => (lastUsed.current.get(a) ?? 0) - (lastUsed.current.get(b) ?? 0))[0];
      return next.filter((s) => s !== oldest);
    });
  }, [activeSlug]);

  // Pré-carregamento: quando um painel termina de carregar, o próximo painel
  // liberado (ainda não aberto) começa a carregar escondido, um por vez.
  const [readyCount, setReadyCount] = useState(0);
  const handleReady = useCallback(() => setReadyCount((n) => n + 1), []);

  useEffect(() => {
    if (!readyCount || !activeSlug || !canPreload()) return;
    const t = setTimeout(() => {
      setKept((prev) => {
        if (prev.length >= MAX_KEPT) return prev;
        const next = pages.find((p) => !prev.includes(p.slug) && embedUrls[p.slug]);
        return next ? [...prev, next.slug] : prev;
      });
    }, PRELOAD_DELAY_MS);
    return () => clearTimeout(t);
  }, [readyCount, activeSlug, pages, embedUrls]);

  // Painel recém-aberto entra já neste render (sem esperar o efeito), e quem
  // perdeu a permissão sai da pilha.
  const rendered = (activeSlug && !kept.includes(activeSlug) ? [...kept, activeSlug] : kept).filter((s) =>
    pages.some((p) => p.slug === s)
  );

  return (
    <div className="relative h-full">
      {children}
      {rendered.map((s) => {
        const isActive = s === activeSlug;
        return (
          <div
            key={s}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 z-10 transition-[opacity,visibility] [transition-duration:180ms]",
              isActive ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
            )}
          >
            <DashboardShell
              slug={s}
              label={pages.find((p) => p.slug === s)!.label}
              active={isActive}
              initialEmbedUrl={embedUrls[s]}
              onReady={handleReady}
            />
          </div>
        );
      })}
    </div>
  );
}
