"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
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

type Mode = "login" | "reset-email" | "reset-password";

const HEADINGS: Record<Mode, string> = {
  login: "Acesse a sua conta",
  "reset-email": "Redefinir senha",
  "reset-password": "Defina sua nova senha",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function goTo(next: Mode) {
    setError(null);
    setInfo(null);
    setNewPassword("");
    setConfirm("");
    setMode(next);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (isDemoMode) {
      const demoUser = demoFindUserByEmail(email);
      if (!demoUser || password !== DEMO_PASSWORD) {
        setError("Email ou senha inválidos.");
        setLoading(false);
        return;
      }
      document.cookie = `${DEMO_SESSION_COOKIE}=${demoUser.id}; path=/`;
      router.push("/");
      router.refresh();
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await checkPasswordReset(email);
      if (!result.allowed) {
        setError(result.error ?? null);
        return;
      }
      goTo("reset-password");
    });
  }

  function handleSaveNewPassword(e: React.FormEvent) {
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
      goTo("login");
      setPassword("");
      setInfo(
        result.demo
          ? "Modo demo: fluxo concluído (a senha demo não muda). Entre com demo123."
          : "Senha alterada. Entre com a nova senha."
      );
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

  const backToLogin = (
    <button
      type="button"
      onClick={() => goTo("login")}
      disabled={pending}
      className="mx-auto flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Voltar ao login
    </button>
  );

  return (
    <AuthShell heading={HEADINGS[mode]}>
      {mode === "login" && (
        <form key="login" onSubmit={handleLogin} className="animate-rise-in space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => goTo("reset-email")}
                disabled={loading}
                className="text-[12px] text-tertiary underline-offset-4 transition-colors hover:text-muted-foreground hover:underline disabled:opacity-50"
              >
                Esqueceu a senha?
              </button>
            </div>
          </div>

          {feedback}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Entrar
          </Button>
        </form>
      )}

      {mode === "reset-email" && (
        <form key="reset-email" onSubmit={handleCheckEmail} className="animate-rise-in space-y-5">
          <p className="text-center text-sm text-muted-foreground">
            Informe seu email. Se o administrador liberou a redefinição para você, já dá para criar a nova senha.
          </p>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>

          {feedback}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Continuar
          </Button>
          {backToLogin}
        </form>
      )}

      {mode === "reset-password" && (
        <form key="reset-password" onSubmit={handleSaveNewPassword} className="animate-rise-in space-y-5">
          <p className="text-center text-sm text-muted-foreground">
            Nova senha para <span className="text-foreground">{email}</span>
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

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Salvar nova senha
          </Button>
          {backToLogin}
        </form>
      )}

      {isDemoMode && mode === "login" && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/[.08] p-3.5 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-primary">Modo demo ativo</p>
          <p>
            admin: <span className="font-mono text-foreground">admin@demo.com</span>
            <br />
            usuário: <span className="font-mono text-foreground">user@demo.com</span>
            <br />
            senha: <span className="font-mono text-foreground">demo123</span>
          </p>
          <p className="mt-2">
            “Esqueceu a senha?” já vem liberado para <span className="font-mono text-foreground">user@demo.com</span>.
          </p>
        </div>
      )}
    </AuthShell>
  );
}
