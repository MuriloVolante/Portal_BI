"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { sendPasswordReset } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { FeedbackText } from "./FeedbackText";

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
    <div className="space-y-2">
      <Button variant="outline" onClick={handleClick} disabled={pending || !email}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Enviar email de redefinição
      </Button>
      <FeedbackText message={message} isError={isError} />
    </div>
  );
}
