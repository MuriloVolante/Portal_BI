import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Abaixo disso não regrava (várias abas/eventos quase juntos). */
const MIN_INTERVAL_MS = 2 * 60_000;

/**
 * Presença: a pessoa voltou para a aba do portal (ou clicou nela) sem abrir
 * um painel novo. Atualiza só o "último acesso" (profiles.last_seen_at); não
 * entra em access_logs, então não infla os gráficos de aberturas de painel.
 */
export async function POST() {
  if (isDemoMode) return new NextResponse(null, { status: 204 });

  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const now = Date.now();
  const cutoff = new Date(now - MIN_INTERVAL_MS).toISOString();
  await createAdminClient()
    .from("profiles")
    .update({ last_seen_at: new Date(now).toISOString() })
    .eq("id", user.id)
    .or(`last_seen_at.is.null,last_seen_at.lt.${cutoff}`);

  return new NextResponse(null, { status: 204 });
}
