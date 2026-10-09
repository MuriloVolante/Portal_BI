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
}

/** loading → (load) arriving: ônibus parte → fading: tela some → done */
type Phase = "loading" | "arriving" | "fading" | "done";

export function PowerBIFrame({ src, title, onLoaded, active = true }: PowerBIFrameProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const notified = useRef(false);

  const handleLoad = useCallback(() => {
    setPhase((p) => (p === "loading" ? "arriving" : p));
    if (!notified.current) {
      notified.current = true;
      onLoaded?.();
    }
  }, [onLoaded]);

  // O iframe vem no HTML do servidor e pode ter carregado antes do React
  // assumir a página: nesse caso o onLoad não dispara, então conferimos.
  useEffect(() => {
    const frame = iframeRef.current;
    if (frame && window.__loadedFrames?.has(frame)) handleLoad();
  }, [handleLoad]);

  // Rede de segurança: se o "load" nunca chegar (bloqueio, rede), não deixa a
  // animação por cima para sempre — o relatório aparece do jeito que estiver.
  useEffect(() => {
    const t = setTimeout(() => handleLoad(), 45_000);
    return () => clearTimeout(t);
  }, [handleLoad]);

  useEffect(() => {
    if (phase !== "fading") return;
    const t = setTimeout(() => setPhase("done"), 320);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {phase !== "done" && (
        <div
          className={cn(
            "absolute inset-0 z-10 bg-background transition-opacity [transition-duration:300ms]",
            phase === "fading" && "opacity-0"
          )}
        >
          <BusLoader
            arriving={phase !== "loading"}
            paused={!active}
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
