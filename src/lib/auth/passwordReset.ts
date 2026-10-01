import { createAdminClient } from "@/lib/supabase/server";

/** Tempo que uma liberação de redefinição fica valendo. */
export const RESET_WINDOW_MS = 24 * 3_600_000;

/**
 * Busca o usuário do Auth pelo email (service role). Lança erro se o
 * Supabase falhar, para não confundir falha com "email não cadastrado".
 */
export async function findAuthUserByEmail(email: string) {
  const target = email.trim().toLowerCase();
  if (!target) return null;
  const admin = createAdminClient();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers falhou: ${error.message}`);
    const users = data?.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (users.length < 1000) return null;
  }
  return null;
}

/** Fim da liberação, se ainda estiver valendo (null caso contrário). */
export async function getResetUntil(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("password_reset_until")
    .eq("id", userId)
    .maybeSingle<{ password_reset_until: string | null }>();
  if (error || !data?.password_reset_until) return null;
  return new Date(data.password_reset_until).getTime() > Date.now() ? data.password_reset_until : null;
}

export function isBannedUser(user: { banned_until?: string }) {
  return !!user.banned_until && new Date(user.banned_until).getTime() > Date.now();
}
