import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} ausente. Configure-a no .env.local (local) ` +
        "ou nas Environment Variables da Vercel."
    );
  }
  return value;
}

/**
 * O Next 14 guarda no Data Cache os fetch GET feitos antes de a página usar
 * cookies() — foi assim que a lista de usuários ficou congelada. Dados do
 * Supabase são sempre ao vivo: nenhuma consulta do servidor vai para o cache.
 */
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

/** Client server-side autenticado com a sessão do usuário (cookies). */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: { fetch: noStoreFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component — pode ser ignorado
            // quando o middleware está renovando a sessão.
          }
        },
      },
    }
  );
}

/**
 * Client com service role — ignora RLS. Usar APENAS no servidor,
 * sempre depois de validar a sessão/permissão do usuário.
 */
export function createAdminClient() {
  return createSupabaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: noStoreFetch },
    }
  );
}
