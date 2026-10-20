"use client";

import { useEffect } from "react";

/** No máximo um aviso a cada 10 min por aba. */
const THROTTLE_MS = 10 * 60_000;
/** Com que frequência confere se a janela ganhou foco (clique dentro do relatório). */
const FOCUS_CHECK_MS = 15_000;

/**
 * Conta como acesso quando a pessoa volta ao portal sem recarregar: a aba
 * volta a aparecer, a janela recebe foco ou ela clica dentro do Power BI
 * (o clique vai para o iframe, então a janela não recebe o evento "focus" —
 * por isso a conferência periódica de document.hasFocus()).
 *
 * Também avisa ao carregar (área admin e quem não tem painel liberado não
 * passam pelo registro de abertura de painel). Olhar uma janela que já estava
 * visível, sem clicar, não gera nenhum evento no navegador e não tem como ser
 * detectado.
 */
export function PresenceBeacon() {
  useEffect(() => {
    let lastSent = 0;
    let hadFocus = document.hasFocus();

    function ping() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastSent < THROTTLE_MS) return;
      lastSent = now;
      fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => undefined);
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    const onFocus = () => {
      hadFocus = true;
      ping();
    };
    const onBlur = () => {
      // O foco pode ter ido para o iframe do relatório (continua na página).
      setTimeout(() => {
        hadFocus = document.hasFocus();
      }, 0);
    };
    const focusCheck = setInterval(() => {
      const hasFocus = document.hasFocus();
      if (hasFocus && !hadFocus) ping();
      hadFocus = hasFocus;
    }, FOCUS_CHECK_MS);

    ping();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pageshow", onVisibility);
    return () => {
      clearInterval(focusCheck);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pageshow", onVisibility);
    };
  }, []);

  return null;
}
