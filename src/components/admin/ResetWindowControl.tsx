"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, X } from "lucide-react";
import { setPasswordResetWindow } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeBR } from "@/lib/utils";
import { FeedbackText } from "./FeedbackText";

interface ResetWindowControlProps {
  userId: string;
  /** Fim da liberação atual (null = não liberada). */
  initialUntil: string | null;
}

/** Libera a redefinição de senha pela tela de login (24h, uso único). */
export function ResetWindowControl({ userId, initialUntil }: ResetWindowControlProps) {
  const [until, setUntil] = useState(initialUntil);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(enabled: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await setPasswordResetWindow(userId, enabled);
      setIsError(!!result.error);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setUntil(result.until ?? null);
      setMessage(enabled ? "Liberado. No próximo login ele vai criar uma nova senha." : "Liberação cancelada.");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {until ? (
          <Badge variant="warning">liberada até {formatDateTimeBR(until)}</Badge>
        ) : (
          <Badge variant="secondary">não liberada</Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => update(true)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
          {until ? "Renovar por 24h" : "Liberar por 24h"}
        </Button>
        {until && (
          <Button variant="ghost" onClick={() => update(false)} disabled={pending}>
            <X />
            Cancelar
          </Button>
        )}
      </div>
      <FeedbackText message={message} isError={isError} />
    </div>
  );
}
