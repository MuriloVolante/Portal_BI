import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Protege tudo, exceto:
     * - _next/static, _next/image (assets)
     * - favicon e arquivos públicos
     * - manifest do PWA (o navegador busca sem cookies de sessão)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
