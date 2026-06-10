import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DEMO_SESSION_COOKIE,
  demoAllowedPages,
  demoGetUser,
  demoProfileOf,
  isDemoMode,
} from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Sessão + páginas permitidas no modo demo (usado pelos hooks no cliente). */
export async function GET() {
  if (!isDemoMode) {
    return NextResponse.json({ error: "Não disponível" }, { status: 404 });
  }

  const id = cookies().get(DEMO_SESSION_COOKIE)?.value;
  const user = demoGetUser(id);

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, created_at: user.created_at },
    profile: demoProfileOf(user),
    pages: demoAllowedPages(user.id, user.role),
  });
}
