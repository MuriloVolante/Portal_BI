"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, RotateCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/components/shell/useSignOut";
import { EmptyState } from "./EmptyState";
import { BrokenLinkArt, EmptySlotArt, LockedArt } from "./arts";

export function NoPanelsState() {
  const signOut = useSignOut();
  return (
    <EmptyState
      art={<EmptySlotArt />}
      title="Nenhum painel liberado ainda"
      description="Assim que a liberação sair, seus dashboards aparecem aqui — e vão direto para o menu lateral."
      actions={
        <Button variant="outline" onClick={signOut}>
          <LogOut />
          Sair
        </Button>
      }
    />
  );
}

export function ForbiddenState({ label }: { label: string | null }) {
  // Ainda não existe um fluxo de pedido de acesso no sistema: o botão orienta
  // o usuário em vez de fingir que um pedido foi enviado.
  const [asked, setAsked] = useState(false);
  const name = label ?? "este painel";

  return (
    <EmptyState
      art={<LockedArt />}
      title="Este painel está fechado para você"
      description={
        <>
          Seu acesso ainda não inclui <em className="font-medium not-italic text-foreground">{name}</em>.
          Um administrador pode liberar em segundos.
        </>
      }
      actions={
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => setAsked(true)}>
              <Send />
              Solicitar acesso
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Voltar ao meu painel</Link>
            </Button>
          </div>
          {asked && (
            <p role="status" className="max-w-sm animate-rise-in text-sm text-muted-foreground">
              Avise um administrador do portal: ele libera <span className="text-foreground">{name}</span> em
              Administração → Usuários.
            </p>
          )}
        </div>
      }
    />
  );
}

export function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      art={<BrokenLinkArt />}
      title="Não deu para carregar o painel"
      description="A conexão com o relatório caiu no meio do caminho. Tentar de novo costuma resolver."
      actions={
        <Button onClick={onRetry}>
          <RotateCw />
          Tentar novamente
        </Button>
      }
    />
  );
}
