"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateUserProfile } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Role } from "@/types";

interface UserProfileFormProps {
  userId: string;
  initialName: string;
  initialRole: Role;
  /** Editando a si mesmo — não pode remover o próprio papel de admin. */
  isSelf: boolean;
}

export function UserProfileForm({
  userId,
  initialName,
  initialRole,
  isSelf,
}: UserProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isAdmin, setIsAdmin] = useState(initialRole === "admin");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await updateUserProfile(userId, {
        full_name: name,
        role: isAdmin ? "admin" : "user",
      });
      setIsError(!!result.error);
      setMessage(result.error ?? "Dados atualizados.");
      if (!result.error) router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Nome</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-admin">Administrador</Label>
          <div className="flex h-9 items-center gap-3">
            <Switch
              id="profile-admin"
              checked={isAdmin}
              onCheckedChange={setIsAdmin}
              disabled={isSelf}
            />
            <span className="text-xs text-muted-foreground">
              {isSelf
                ? "Você não pode alterar o próprio papel."
                : "Acessa tudo, inclusive esta área."}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar dados
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
    </form>
  );
}
