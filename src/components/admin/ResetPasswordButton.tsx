"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { sendPasswordReset } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";

interface ResetPasswordButtonProps {
  email: string;
}

export function ResetPasswordButton({ email }: ResetPasswordButtonProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const { error } = await sendPasswordReset(email);
      setIsError(!!error);
      setMessage(error ?? "Email de redefinição enviado.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={pending || !email}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="h-4 w-4" />
        )}
        Enviar redefinição de senha
      </Button>
      {message && (
        <span
          className={
            isError ? "text-sm text-destructive" : "text-sm text-primary"
          }
        >
          {message}
        </span>
      )}
    </div>
  );
}
