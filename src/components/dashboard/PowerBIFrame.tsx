"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BusLoader } from "./BusLoader";
import { cn } from "@/lib/utils";

/**
 * Altura do rodapé do Power BI escondida por crop visual:
 * o container usa overflow-hidden e o iframe recebe
 * height: calc(100% + 72px), empurrando o rodapé para fora
 * da área visível sem removê-lo de fato.
 */
const POWER_BI_FOOTER_CROP_PX = 72;

/**
 * O "load" do iframe chega quando a página do Power BI abre, mas ele ainda
 * passa alguns segundos na própria tela de "Carregando dados…". A animação
 * espera mais este tempo antes de revelar o relatório. No recarregar o
 * Power BI já está em cache e volta mais rápido.
 */
const SETTLE_FIRST_MS = 4000;
const SETTLE_RELOAD_MS = 3500;
/** Se a entrada do recarregar não avisar que cobriu a tela, segue assim mesmo. */
const COVER_FALLBACK_MS = 3000;

declare global {
  interface Window {
    /** Iframes que já dispararam "load" (registrado no <head>, antes do React). */
    __loadedFrames?: WeakSet<HTMLIFrameElement>;
  }
}

interface PowerBIFrameProps {
  src: string;
  title?: string;
  onLoaded?: () => void;
  /** false com o painel em segundo plano: a animação não roda. */
  active?: boolean;
  /** Muda a cada clique em "Recarregar". */
  reloadToken?: number;
}

/**
 * covering (só no recarregar): o ônibus entra sobre o relatório e a cidade
 * aparece em volta até cobrir tudo →
 * loading → (load) settling: espera o Power BI terminar de desenhar →
 * arriving: ônibus parte → fading: tela some → done
 */
type Phase = "covering" | "loading" | "settling" | "arriving" | "fading" | "done";

export function PowerBIFrame({ src, title, onLoaded, active = true, reloadToken = 0 }: PowerBIFrameProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  /** Cada carregamento (o primeiro e cada recarregar) é um ciclo. */
  const [cycle, setCycle] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const notifiedCycle = useRef(-1);
  const isReload = cycle > 0;

  const handleLoad = useCallback(() => {
    setPhase((p) => (p === "loading" ? "settling" : p));
  }, []);

  // O iframe vem no HTML do servidor e pode ter carregado antes do React
  // assumir a página: nesse caso o onLoad não dispara, então conferimos.
  useEffect(() => {
    const frame = iframeRef.current;
    if (frame && window.__loadedFrames?.has(frame)) handleLoad();
  }, [handleLoad]);

  // Recarregar: primeiro a entrada do ônibus cobre o relatório (BusLoader
  // avisa em onCovered), depois o iframe recarrega por baixo — assim a tela
  // branca do Power BI reiniciando nunca aparece.
  const firstToken = useRef(reloadToken);
  useEffect(() => {
    if (reloadToken === firstToken.current) return;
    firstToken.current = reloadToken;
    setCycle((c) => c + 1);
    setPhase("covering");
  }, [reloadToken]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startReload = useCallback(() => {
    if (phaseRef.current !== "covering") return;
    phaseRef.current = "loading";
    const frame = iframeRef.current;
    if (frame) frame.src = src; // reatribuir o mesmo endereço recarrega o iframe
    setPhase("loading");
  }, [src]);

  useEffect(() => {
    if (phase !== "covering") return;
    const t = setTimeout(startReload, COVER_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [phase, startReload]);

  useEffect(() => {
    if (phase !== "settling") return;
    const t = setTimeout(() => {
      setPhase("arriving");
      // Só agora conta como carregado: libera o "aberto às" e o
      // pré-carregamento dos outros painéis (que não disputa mais a rede).
      if (notifiedCycle.current !== cycle) {
        notifiedCycle.current = cycle;
        onLoaded?.();
      }
    }, isReload ? SETTLE_RELOAD_MS : SETTLE_FIRST_MS);
    return () => clearTimeout(t);
  }, [phase, cycle, isReload, onLoaded]);

  // Rede de segurança: se o "load" nunca chegar (bloqueio, rede), não deixa a
  // animação por cima para sempre — o relatório aparece do jeito que estiver.
  useEffect(() => {
    const t = setTimeout(() => handleLoad(), 45_000);
    return () => clearTimeout(t);
  }, [handleLoad, cycle]);

  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => setPhase("done"), 320);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {phase !== "done" && (
        <div
          key={cycle}
          className={cn(
            "absolute inset-0 z-10 transition-opacity [transition-duration:300ms]",
            // No recarregar o fundo é do próprio BusLoader (começa transparente).
            !isReload && "bg-background",
            phase === "fading" && "opacity-0"
          )}
        >
          <BusLoader
            arriving={phase === "arriving" || phase === "fading"}
            paused={!active}
            intro={isReload}
            onCovered={startReload}
            onDone={() => setPhase((p) => (p === "arriving" ? "fading" : p))}
          />
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title={title ?? "Dashboard Power BI"}
        loading="eager"
        allowFullScreen
        onLoad={handleLoad}
        className="absolute inset-x-0 top-0 w-full border-0"
        style={{ height: `calc(100% + ${POWER_BI_FOOTER_CROP_PX}px)` }}
      />
    </div>
  );
}
