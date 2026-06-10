import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  demoGetPageBySlug,
  demoHasPermission,
  isDemoMode,
} from "@/lib/demo";
import { getSessionInfo } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Entrega a URL de embed do Power BI de forma autenticada.
 * A URL real vive apenas no banco (pages.embed_url) e nunca é
 * exposta diretamente ao frontend — só sai daqui após validar
 * a sessão e a permissão do usuário.
 */
export async function GET(request: NextRequest) {
  const pageSlug = request.nextUrl.searchParams.get("pageSlug");

  if (!pageSlug) {
    return NextResponse.json(
      { error: "pageSlug é obrigatório" },
      { status: 400 }
    );
  }

  // Modo demo: mesma lógica de validação, dados em memória.
  if (isDemoMode) {
    const session = await getSessionInfo();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const page = demoGetPageBySlug(pageSlug);
    if (!page || !page.is_active) {
      return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
    }
    const allowed =
      session.profile?.role === "admin" ||
      demoHasPermission(session.user.id, page.id);
    if (!allowed) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
    return NextResponse.json({ embedUrl: page.embed_url });
  }

  // 1. Valida a sessão do usuário
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 2. Busca a página (service role — embed_url é invisível ao client)
  const admin = createAdminClient();
  const { data: page } = await admin
    .from("pages")
    .select("id, embed_url, is_active")
    .eq("slug", pageSlug)
    .maybeSingle<{ id: string; embed_url: string; is_active: boolean }>();

  if (!page || !page.is_active) {
    return NextResponse.json(
      { error: "Página não encontrada" },
      { status: 404 }
    );
  }

  // 3. Verifica a permissão (admin tem acesso a tudo)
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile?.role !== "admin") {
    const { count } = await admin
      .from("user_pages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("page_id", page.id);

    if (!count) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
  }

  return NextResponse.json({ embedUrl: page.embed_url });
}
