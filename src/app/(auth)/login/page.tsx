"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DEMO_PASSWORD,
  DEMO_SESSION_COOKIE,
  demoFindUserByEmail,
  isDemoMode,
} from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm animate-fade-in">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Portal BI</CardTitle>
          <CardDescription>
            Acesse seus dashboards Power BI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-primary" role="status">
                {info}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Entrar
            </Button>

            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Esqueci minha senha
            </Button>
          </form>

          {isDemoMode && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-primary">Modo demo ativo</p>
              <p>
                admin: <span className="font-mono">admin@demo.com</span>
                <br />
                usuário: <span className="font-mono">user@demo.com</span>
                <br />
                senha: <span className="font-mono">demo123</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
