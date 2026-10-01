"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { demoFindUserByEmail, demoResetUntil, demoSetResetWindow, isDemoMode } from "@/lib/demo";
import { findAuthUserByEmail, getResetUntil, isBannedUser } from "@/lib/auth/passwordReset";

// Ações públicas (sem sessão) do login em etapas.

const NOT_ALLOWED =
  "A redefinição de senha não está liberada para este email. Peça ao administrador do portal para liberar.";
const UNKNOWN_EMAIL = "Este email não está cadastrado no portal. Confira o endereço ou fale com o administrador.";
const BLOCKED = "Este acesso está desativado. Fale com o administrador do portal.";
const UNAVAILABLE = "Não foi possível verificar o email agora. Tente de novo em instantes.";

async function lookupUser(email: string) {
  try {
    return { user: await findAuthUserByEmail(email) };
  } catch (err) {
    console.error("[login] busca de usuário falhou:", err);
    return { failed: true as const, user: null };
  }
}

export type LoginEmailStep = "password" | "new-password";

/**
 * Primeira etapa do login: diz se o email entra com a senha atual ou se
 * precisa criar uma nova. Email não cadastrado ou desativado para aqui
 * mesmo (decisão consciente: o portal é interno e isso evita a pessoa
 * digitar uma senha que nunca vai funcionar).
 */
export async function checkLoginEmail(email: string): Promise<{ next?: LoginEmailStep; error?: string }> {
  if (isDemoMode) {
    const user = demoFindUserByEmail(email);
    if (!user) return { error: UNKNOWN_EMAIL };
    if (user.banned) return { error: BLOCKED };
    return { next: demoResetUntil(user.id) ? "new-password" : "password" };
  }

  const { user, failed } = await lookupUser(email);
  if (failed) return { error: UNAVAILABLE };
  if (!user) return { error: UNKNOWN_EMAIL };
  if (isBannedUser(user as { banned_until?: string })) return { error: BLOCKED };
  return { next: (await getResetUntil(user.id)) ? "new-password" : "password" };
}

export async function resetPasswordWithWindow(
  email: string,
  password: string
): Promise<{ error?: string; demo?: boolean }> {
  if (!password || password.length < 6) return { error: "A senha deve ter pelo menos 6 caracteres." };

  if (isDemoMode) {
    const user = demoFindUserByEmail(email);
    if (!user || !demoResetUntil(user.id)) return { error: NOT_ALLOWED };
    demoSetResetWindow(user.id, null);
    return { demo: true };
  }

  // Revalida tudo no servidor: a tela nunca decide sozinha.
  const { user, failed } = await lookupUser(email);
  if (failed) return { error: UNAVAILABLE };
  if (!user || isBannedUser(user as { banned_until?: string }) || !(await getResetUntil(user.id))) {
    return { error: NOT_ALLOWED };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) return { error: "Não foi possível salvar a nova senha. Tente de novo." };

  // Uso único: a liberação acaba assim que a senha é trocada.
  await admin.from("profiles").update({ password_reset_until: null }).eq("id", user.id);
  return {};
}
