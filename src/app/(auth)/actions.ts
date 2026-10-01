"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { demoFindUserByEmail, demoResetUntil, demoSetResetWindow, isDemoMode } from "@/lib/demo";
import { findAuthUserByEmail, getResetUntil, isBannedUser } from "@/lib/auth/passwordReset";

// Ações públicas (sem sessão) do "Esqueceu a senha?". A resposta é a mesma
// para email inexistente e para email sem liberação, para não revelar quem
// tem conta no portal.

const NOT_ALLOWED =
  "A redefinição de senha não está liberada para este email. Peça ao administrador do portal para liberar.";

export async function checkPasswordReset(email: string): Promise<{ allowed: boolean; error?: string }> {
  if (isDemoMode) {
    const user = demoFindUserByEmail(email);
    return user && demoResetUntil(user.id) ? { allowed: true } : { allowed: false, error: NOT_ALLOWED };
  }

  const user = await findAuthUserByEmail(email);
  if (!user || isBannedUser(user as { banned_until?: string })) return { allowed: false, error: NOT_ALLOWED };
  return (await getResetUntil(user.id)) ? { allowed: true } : { allowed: false, error: NOT_ALLOWED };
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
  const user = await findAuthUserByEmail(email);
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
