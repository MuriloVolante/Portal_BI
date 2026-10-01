"use client";

import { useState, useTransition } from "react";
import { KeySquare, Loader2 } from "lucide-react";
import { setUserPassword } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResetPasswordButton } from "./ResetPasswordButton";
import { FeedbackText } from "./FeedbackText";

interface UserPasswordActionsProps {
  userId: string;
  email: string;
}

/** Senha: enviar email de redefinição ou definir uma nova diretamente. */
export function UserPasswordActions({ userId, email }: UserPasswordActionsProps) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await setUserPassword(userId, password);
      setIsError(!!result.error);
      setMessage(result.error ?? "Senha alterada.");
      if (!result.error) setPassword("");
    });
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Redefinição por email</Label>
        <p className="text-xs text-muted-foreground">O usuário escolhe a nova senha pelo link.</p>
        <ResetPasswordButton email={email} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="set-password">Definir nova senha</Label>
        <div className="flex gap-2">
          <Input
            id="set-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
            minLength={6}
            autoComplete="new-password"
            required
          />
          <Button type="submit" variant="outline" disabled={pending} className="shrink-0">
            {pending ? <Loader2 className="animate-spin" /> : <KeySquare />}
            Alterar
          </Button>
        </div>
        <FeedbackText message={message} isError={isError} />
      </form>
    </div>
  );
}
