"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, Trash2, UserCheck } from "lucide-react";
import { deleteUser, setUserBanned } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./ConfirmDialog";
import { FeedbackText } from "./FeedbackText";

interface UserDangerZoneProps {
  userId: string;
  email: string;
  /** O admin não pode desativar nem excluir a própria conta. */
  isSelf: boolean;
  initialBanned: boolean;
}

export function UserDangerZone({ userId, email, isSelf, initialBanned }: UserDangerZoneProps) {
  const router = useRouter();
  const [banned, setBanned] = useState(initialBanned);
  const [confirm, setConfirm] = useState<"ban" | "delete" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [accessMsg, setAccessMsg] = useState<string | null>(null);
  const [accessErr, setAccessErr] = useState(false);
  const [accessPending, startAccess] = useTransition();
  const [deletePending, startDelete] = useTransition();

  function applyBan(next: boolean) {
    setAccessMsg(null);
    setDialogError(null);
    startAccess(async () => {
      const result = await setUserBanned(userId, next);
      if (result.error) {
        if (confirm) setDialogError(result.error);
        else {
          setAccessErr(true);
          setAccessMsg(result.error);
        }
        return;
      }
      setConfirm(null);
      setBanned(next);
      setAccessErr(false);
      setAccessMsg(next ? "Acesso desativado." : "Acesso reativado.");
      router.refresh();
    });
  }

  function applyDelete() {
    setDialogError(null);
    startDelete(async () => {
      const result = await deleteUser(userId);
      if (result.error) {
        setDialogError(result.error);
        return;
      }
      router.push("/admin/usuarios");
      router.refresh();
    });
  }

  function openConfirm(kind: "ban" | "delete") {
    setDialogError(null);
    setConfirm(kind);
  }

  return (
    <div className="divide-y divide-destructive/20">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Acesso ao sistema</p>
            <Badge variant={banned ? "destructive" : "default"}>{banned ? "desativado" : "ativo"}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSelf
              ? "Você não pode desativar a própria conta."
              : "Desativar desconecta o usuário na hora e bloqueia novos logins."}
          </p>
          <FeedbackText message={accessMsg} isError={accessErr} />
        </div>
        <Button
          variant="outline"
          onClick={() => (banned ? applyBan(false) : openConfirm("ban"))}
          disabled={accessPending || isSelf}
        >
          {accessPending && !confirm ? <Loader2 className="animate-spin" /> : banned ? <UserCheck /> : <Ban />}
          {banned ? "Reativar acesso" : "Desativar acesso"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <div>
          <p className="text-sm font-medium">Excluir usuário</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSelf
              ? "Você não pode excluir a própria conta."
              : "Remove a conta e todas as liberações. Não dá para desfazer."}
          </p>
        </div>
        <Button variant="destructive" onClick={() => openConfirm("delete")} disabled={deletePending || isSelf}>
          <Trash2 />
          Excluir usuário
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === "ban"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Desativar o acesso?"
        description={
          <>
            <span className="text-foreground">{email}</span> será desconectado e não conseguirá entrar até
            ser reativado. As liberações de painéis continuam guardadas.
          </>
        }
        confirmLabel="Desativar acesso"
        destructive
        pending={accessPending}
        error={dialogError}
        onConfirm={() => applyBan(true)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Excluir este usuário?"
        description={
          <>
            A conta de <span className="text-foreground">{email}</span> e todas as liberações dela serão
            removidas. Essa ação é permanente.
          </>
        }
        confirmLabel="Excluir usuário"
        destructive
        pending={deletePending}
        error={dialogError}
        onConfirm={applyDelete}
      />
    </div>
  );
}
