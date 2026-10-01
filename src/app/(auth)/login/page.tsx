"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DEMO_PASSWORD,
  DEMO_SESSION_COOKIE,
  demoFindUserByEmail,
  isDemoMode,
} from "@/lib/demo";
import { checkPasswordReset, resetPasswordWithWindow } from "../actions";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Login em etapas (estilo Senior): primeiro o email; o servidor diz se a
 * pessoa entra com a senha atual ou se precisa criar uma nova (redefinição
 * liberada pelo admin).
 */
type Step = "email" | "password" | "new-password";

const HEADINGS: Record<Step, string> = {
  email: "Acesse a sua conta",
  password: "Acesse a sua conta",
  "new-password": "Crie sua nova senha",
};

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const busy = loading || pending;

  function goTo(next: Step) {
    setError(null);
    setInfo(null);
    setPassword("");
    setNewPassword("");
    setConfirm("");
    setStep(next);
  }

  async function signIn(pass: string): Promise<boolean> {
    if (isDemoMode) {
      const demoUser = demoFindUserByEmail(email);
      if (!demoUser || pass !== DEMO_PASSWORD) return false;
      document.cookie = `${DEMO_SESSION_COOKIE}=${demoUser.id}; path=/`;
    } else {
      const { error } = await createClient().auth.signInWithPassword({ email, password: pass });
      if (error) return false;
    }
    router.push("/");
    router.refresh();
    return true;
  }

  function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await checkPasswordReset(email);
      // Email desconhecido também segue para a senha (e falha lá), para não
      // revelar quem tem conta no portal.
      goTo(result.allowed ? "new-password" : "password");
    });
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    if (!(await signIn(password))) {
      setError("Email ou senha inválidos.");
      setLoading(false);
    }
  }

  function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    startTransition(async () => {
      const result = await resetPasswordWithWindow(email, newPassword);
      if (result.error) {
        setError(result.error);
        return;
      }
      setLoading(true);
      // No demo a senha não muda de verdade: entra com a senha demo.
      const ok = await signIn(result.demo ? DEMO_PASSWORD : newPassword);
      if (!ok) {
        setLoading(false);
        goTo("password");
        setInfo("Senha criada. Entre com a nova senha.");
      }
    });
  }

  const feedback = (
    <>
      {error && (
        <p className="animate-rise-in text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {info && (
        <p className="animate-rise-in text-sm text-primary" role="status">
          {info}
        </p>
      )}
    </>
  );

  const emailChip = (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/60 px-3 py-2.5">
      <span className="truncate text-sm">{email}</span>
      <button
        type="button"
        onClick={() => goTo("email")}
        disabled={busy}
        className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <ArrowLeft className="h-3 w-3" />
        Trocar
      </button>
    </div>
  );

  return (
    <AuthShell heading={HEADINGS[step]}>
      {step === "email" && (
        <form key="email" onSubmit={handleEmail} className="animate-rise-in space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="usuario@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          {feedback}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            Próximo
            {!busy && <ArrowRight />}
          </Button>
        </form>
      )}

      {step === "password" && (
        <form key="password" onSubmit={handlePassword} className="animate-rise-in space-y-5">
          {emailChip}
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfo("Peça ao administrador do portal para liberar a redefinição. Depois, entre de novo com seu email.");
                }}
                disabled={busy}
                className="text-[12px] text-tertiary underline-offset-4 transition-colors hover:text-muted-foreground hover:underline disabled:opacity-50"
              >
                Esqueceu a senha?
              </button>
            </div>
          </div>
          {feedback}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {loading && <Loader2 className="animate-spin" />}
            Entrar
          </Button>
        </form>
      )}

      {step === "new-password" && (
        <form key="new-password" onSubmit={handleNewPassword} className="animate-rise-in space-y-5">
          {emailChip}
          <p className="text-sm text-muted-foreground">
            Sua senha foi redefinida. Crie uma nova para continuar.
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo de 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {feedback}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Salvar e entrar
          </Button>
        </form>
      )}

      {isDemoMode && step === "email" && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/[.08] p-3.5 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-primary">Modo demo ativo</p>
          <p>
            admin: <span className="font-mono text-foreground">admin@demo.com</span> (senha{" "}
            <span className="font-mono text-foreground">demo123</span>)
            <br />
            <span className="font-mono text-foreground">user@demo.com</span> está com a senha redefinida: vai pedir uma
            nova.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
