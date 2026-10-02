import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionInfo } from "@/lib/auth/session";
import { demoGetPageBySlug, demoHasPermission, isDemoMode } from "@/lib/demo";

export type PageAccess =
  | { ok: true; user: User; page: { id: string; label: string } }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Mesma regra do /api/embed-url: sessão válida, página ativa e permissão
 * (admin vê tudo; usuário comum só o que estiver em user_pages).
 */
export async function checkPageAccess(slug: string): Promise<PageAccess> {
  const session = await getSessionInfo();
  if (!session) return { ok: false, status: 401, error: "Não autenticado" };
  const isAdmin = session.profile?.role === "admin";

  if (isDemoMode) {
    const page = demoGetPageBySlug(slug);
    if (!page || !page.is_active) return { ok: false, status: 404, error: "Página não encontrada" };
    if (!isAdmin && !demoHasPermission(session.user.id, page.id)) {
      return { ok: false, status: 403, error: "Sem permissão" };
    }
    return { ok: true, user: session.user, page: { id: page.id, label: page.label } };
  }

  const admin = createAdminClient();
  const { data: page } = await admin
    .from("pages")
    .select("id, label, is_active")
    .eq("slug", slug)
    .maybeSingle<{ id: string; label: string; is_active: boolean }>();
  if (!page || !page.is_active) return { ok: false, status: 404, error: "Página não encontrada" };

  if (!isAdmin) {
    const { count } = await admin
      .from("user_pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .eq("page_id", page.id);
    if (!count) return { ok: false, status: 403, error: "Sem permissão" };
  }

  return { ok: true, user: session.user, page: { id: page.id, label: page.label } };
}
