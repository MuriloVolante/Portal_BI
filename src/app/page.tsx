import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Após o login, redireciona para o primeiro dashboard permitido do usuário.
 * Admin sem permissões explícitas cai na área administrativa.
 */
export default async function HomePage() {
  const { user, profile } = await requireUser();
  const supabase = createClient();

  let firstSlug: string | null = null;

  if (profile?.role === "admin") {
    const { data } = await supabase
      .from("pages")
      .select("slug")
      .eq("is_active", true)
      .order("order", { ascending: true })
      .limit(1)
      .maybeSingle();
    firstSlug = data?.slug ?? null;
    if (!firstSlug) redirect("/admin");
  } else {
    const { data } = await supabase
      .from("user_pages")
      .select("page:pages(slug, order, is_active)")
      .eq("user_id", user.id);

    const pages = (data ?? [])
      .map((row) => row.page as unknown as { slug: string; order: number; is_active: boolean } | null)
      .filter((p): p is { slug: string; order: number; is_active: boolean } => !!p && p.is_active)
      .sort((a, b) => a.order - b.order);

    firstSlug = pages[0]?.slug ?? null;
  }

  if (firstSlug) redirect(`/dashboard/${firstSlug}`);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <LayoutDashboard className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Nenhum dashboard disponível</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Você ainda não tem acesso a nenhuma página. Entre em contato com um
        administrador para solicitar permissões.
      </p>
    </div>
  );
}
