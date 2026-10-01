import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { demoAllowedPages, demoGetPageBySlug, isDemoMode } from "@/lib/demo";
import type { Role, SidebarPage } from "@/types";

// Colunas seguras — embed_url nunca sai daqui.
const SAFE_COLUMNS = 'id, slug, label, icon, "order", is_active, created_at';

/**
 * Páginas que o usuário pode ver no portal, na ordem da sidebar.
 * Admin enxerga todas as páginas ativas; usuário comum, só as liberadas em
 * user_pages (a RLS também garante isso). Memorizado por requisição, então
 * o layout e a página podem chamar sem repetir a consulta.
 */
export const getAllowedPages = cache(async function getAllowedPages(
  userId: string,
  role: Role
): Promise<SidebarPage[]> {
  if (isDemoMode) return demoAllowedPages(userId, role);

  const supabase = createClient();

  if (role === "admin") {
    const { data } = await supabase
      .from("pages")
      .select(SAFE_COLUMNS)
      .eq("is_active", true)
      .order("order", { ascending: true });
    return (data ?? []) as unknown as SidebarPage[];
  }

  const { data } = await supabase
    .from("user_pages")
    .select(`page:pages(${SAFE_COLUMNS})`)
    .eq("user_id", userId);

  return (data ?? [])
    .map((row) => row.page as unknown as SidebarPage | null)
    .filter((p): p is SidebarPage => !!p && p.is_active)
    .sort((a, b) => a.order - b.order);
});

/** Nome de exibição de uma página pelo slug (para cabeçalhos e mensagens). */
export async function getPageLabel(slug: string): Promise<string | null> {
  if (isDemoMode) return demoGetPageBySlug(slug)?.label ?? null;

  const supabase = createClient();
  const { data } = await supabase
    .from("pages")
    .select("label")
    .eq("slug", slug)
    .maybeSingle<{ label: string }>();
  return data?.label ?? null;
}
