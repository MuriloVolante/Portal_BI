"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DEMO_PASSWORD,
  DEMO_SESSION_COOKIE,
  demoFindUserByEmail,
  isDemoMode,
} from "@/lib/demo";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
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

  async function handleForgotPassword() {
    setError(null);
    setInfo(null);

    if (isDemoMode) {
      setInfo("Modo demo: a redefinição de senha fica disponível com o Supabase configurado.");
      return;
    }

    if (!email) {
      setError("Informe seu email para redefinir a senha.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError("Não foi possível enviar o email de redefinição.");
      return;
    }

    setInfo("Enviamos um link de redefinição de senha para o seu email.");
  }

  return (
    <AuthShell heading="Acesse a sua conta">
      <form onSubmit={handleSubmit} className="space-y-5">
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
          {/* Discreto de propósito: o Supabase limita o envio desse email. */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-[12px] text-tertiary underline-offset-4 transition-colors hover:text-muted-foreground hover:underline disabled:opacity-50"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>

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

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Entrar
        </Button>
      </form>

      {isDemoMode && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/[.08] p-3.5 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-primary">Modo demo ativo</p>
          <p>
            admin: <span className="font-mono text-foreground">admin@demo.com</span>
            <br />
            usuário: <span className="font-mono text-foreground">user@demo.com</span>
            <br />
            senha: <span className="font-mono text-foreground">demo123</span>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
