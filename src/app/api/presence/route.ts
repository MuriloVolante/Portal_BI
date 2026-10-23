import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Abaixo disso não registra de novo (várias abas, ou logo após abrir o painel). */
const MIN_INTERVAL_MS = 2 * 60_000;
/** Nome no histórico quando a pessoa está no portal sem um painel na tela. */
const PORTAL_LABEL = "Portal";

/**
 * Retorno ao portal: a pessoa voltou para uma aba que já estava aberta.
 * Entra no histórico (access_logs, kind = 'return') com o painel que está na
 * tela e atualiza o último acesso — a mesma fonte do gráfico e da atividade
 * recente.
 */
export async function POST(request: NextRequest) {
  if (isDemoMode) return new NextResponse(null, { status: 204 });

  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { slug?: unknown };
  const slug = typeof body.slug === "string" && body.slug.length <= 120 ? body.slug : null;

  const admin = createAdminClient();
  const since = new Date(Date.now() - MIN_INTERVAL_MS).toISOString();
  const [{ count: recent }, { data: profile }, { data: page }] = await Promise.all([
    admin.from("access_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since),
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>(),
    slug
      ? admin.from("pages").select("id, label").eq("slug", slug).eq("is_active", true).maybeSingle<{ id: string; label: string }>()
      : Promise.resolve({ data: null }),
  ]);
  if (recent) return new NextResponse(null, { status: 204 });

  // Só associa ao painel se a pessoa tem acesso a ele (admin vê todos).
  let target: { id: string; label: string } | null = page ?? null;
  if (target && profile?.role !== "admin") {
    const { count } = await admin
      .from("user_pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("page_id", target.id);
    if (!count) target = null;
  }

  const now = new Date().toISOString();
  await Promise.all([
    admin.from("access_logs").insert({
      user_id: user.id,
      page_id: target?.id ?? null,
      page_label: target?.label ?? PORTAL_LABEL,
      kind: "return",
      created_at: now,
    }),
    admin.from("profiles").update({ last_seen_at: now }).eq("id", user.id),
  ]);

  return new NextResponse(null, { status: 204 });
}
