"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, KeySquare, Loader2, Trash2, UserCheck } from "lucide-react";
import {
  deleteUser,
  setUserBanned,
  setUserPassword,
} from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResetPasswordButton } from "./ResetPasswordButton";

interface UserSecurityActionsProps {
  userId: string;
  email: string;
  /** O admin não pode desativar nem excluir a própria conta. */
  isSelf: boolean;
  initialBanned: boolean;
}

function FeedbackMessage({
  message,
  isError,
}: {
  message: string | null;
  isError: boolean;
}) {
  if (!message) return null;
  return (
    <span className={isError ? "text-sm text-destructive" : "text-sm text-primary"}>
      {message}
    </span>
  );
}

export function UserSecurityActions({
  userId,
  email,
  isSelf,
  initialBanned,
}: UserSecurityActionsProps) {
  const router = useRouter();
  const [banned, setBanned] = useState(initialBanned);

  const [password, setPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState(false);
  const [passwordPending, startPassword] = useTransition();

  const [accessMsg, setAccessMsg] = useState<string | null>(null);
  const [accessErr, setAccessErr] = useState(false);
  const [accessPending, startAccess] = useTransition();

  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    startPassword(async () => {
      const result = await setUserPassword(userId, password);
      setPasswordErr(!!result.error);
      setPasswordMsg(result.error ?? "Senha alterada.");
      if (!result.error) setPassword("");
    });
  }

  function handleToggleBan() {
    const next = !banned;
    if (
      next &&
      !window.confirm(
        "Desativar o acesso deste usuário? Ele será desconectado e não conseguirá mais entrar até ser reativado."
      )
    ) {
      return;
    }
    setAccessMsg(null);
    startAccess(async () => {
      const result = await setUserBanned(userId, next);
      setAccessErr(!!result.error);
      if (result.error) {
        setAccessMsg(result.error);
        return;
      }
      setBanned(next);
      setAccessMsg(next ? "Acesso desativado." : "Acesso reativado.");
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Excluir o usuário ${email}? Esta ação é permanente e remove também as permissões dele.`
      )
    ) {
      return;
    }
    setDeleteMsg(null);
    startDelete(async () => {
      const result = await deleteUser(userId);
      if (result.error) {
        setDeleteMsg(result.error);
        return;
      }
      router.push("/admin/usuarios");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Redefinição por email */}
      <div className="space-y-2">
        <Label>Redefinição por email</Label>
        <ResetPasswordButton email={email} />
      </div>

      {/* Alterar senha diretamente */}
      <form onSubmit={handleSetPassword} className="space-y-2 border-t pt-4">
        <Label htmlFor="set-password">Definir nova senha</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="set-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
            minLength={6}
            autoComplete="new-password"
            className="max-w-xs"
            required
          />
          <Button type="submit" size="sm" variant="outline" disabled={passwordPending}>
            {passwordPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeySquare className="h-4 w-4" />
            )}
            Alterar senha
          </Button>
          <FeedbackMessage message={passwordMsg} isError={passwordErr} />
        </div>
      </form>

      {/* Desativar / reativar acesso */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center gap-2">
          <Label>Acesso ao sistema</Label>
          <Badge variant={banned ? "destructive" : "secondary"}>
            {banned ? "desativado" : "ativo"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={banned ? "outline" : "secondary"}
            onClick={handleToggleBan}
            disabled={accessPending || isSelf}
          >
            {accessPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : banned ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <Ban className="h-4 w-4" />
            )}
            {banned ? "Reativar acesso" : "Desativar acesso"}
          </Button>
          <FeedbackMessage message={accessMsg} isError={accessErr} />
        </div>
        {isSelf && (
          <p className="text-xs text-muted-foreground">
            Você não pode desativar a própria conta.
          </p>
        )}
      </div>

      {/* Excluir usuário */}
      <div className="space-y-2 border-t pt-4">
        <Label>Zona de perigo</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={deletePending || isSelf}
          >
            {deletePending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Excluir usuário
          </Button>
          <FeedbackMessage message={deleteMsg} isError />
        </div>
        <p className="text-xs text-muted-foreground">
          {isSelf
            ? "Você não pode excluir a própria conta."
            : "Remove a conta e todas as permissões. Ação permanente."}
        </p>
      </div>
    </div>
  );
}
