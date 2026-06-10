import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

export interface SessionInfo {
  user: User;
  profile: Profile | null;
}

/** Retorna o usuário autenticado e seu profile, ou null. */
export async function getSessionInfo(): Promise<SessionInfo | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", user.id)
    .single<Profile>();

  return { user, profile };
}

/** Exige sessão válida — redireciona para /login caso contrário. */
export async function requireUser(): Promise<SessionInfo> {
  const session = await getSessionInfo();
  if (!session) redirect("/login");
  return session;
}

/** Exige role admin — redireciona para o portal caso contrário. */
export async function requireAdmin(): Promise<SessionInfo> {
  const session = await requireUser();
  if (session.profile?.role !== "admin") redirect("/");
  return session;
}
