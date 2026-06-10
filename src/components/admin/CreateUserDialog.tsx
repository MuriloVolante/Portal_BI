"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { createUser } from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  isAdmin: false,
};

export function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createUser({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.isAdmin ? "admin" : "user",
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button onClick={openDialog}>
        <UserPlus className="h-4 w-4" />
        Novo usuário
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription>
              O usuário já é criado confirmado e pode entrar com a senha
              definida aqui. Depois, libere as páginas dele na edição.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome</Label>
              <Input
                id="new-name"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                placeholder="Maria Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="maria@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha inicial</Label>
              <Input
                id="new-password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                placeholder="Mínimo de 6 caracteres"
                minLength={6}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div>
                <Label htmlFor="new-admin" className="cursor-pointer">
                  Administrador
                </Label>
                <p className="text-xs text-muted-foreground">
                  Acessa todos os dashboards e a área de administração.
                </p>
              </div>
              <Switch
                id="new-admin"
                checked={form.isAdmin}
                onCheckedChange={(v) => setForm({ ...form, isAdmin: v })}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
