"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { PowerBIFrame } from "./PowerBIFrame";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardShellProps {
  slug: string;
}

type ShellState =
  | { status: "loading" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; embedUrl: string };

/**
 * Busca a URL de embed no servidor (/api/embed-url) e renderiza o iframe.
 * Ao navegar entre dashboards o componente não é remontado — apenas o
 * src do iframe muda quando a nova URL chega.
 */
export function DashboardShell({ slug }: DashboardShellProps) {
  const [state, setState] = useState<ShellState>({ status: "loading" });
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

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
        if (cancelled) return;
        setEmbedUrl(embedUrl);
        setState({ status: "ready", embedUrl });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "forbidden" || state.status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <ShieldAlert className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">
          {state.status === "forbidden"
            ? "Acesso não autorizado"
            : "Erro ao carregar o dashboard"}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {state.status === "forbidden"
            ? "Você não tem permissão para visualizar este dashboard. Fale com um administrador."
            : "Algo deu errado ao buscar o dashboard. Tente novamente em instantes."}
        </p>
      </div>
    );
  }

  // Mantém o iframe montado entre trocas de página: apenas o src muda.
  if (embedUrl) {
    return (
      <div className="h-full animate-fade-in">
        <PowerBIFrame src={embedUrl} />
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <Skeleton className="h-full w-full" />
    </div>
  );
}
