import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  DEMO_SESSION_COOKIE,
  demoGetUser,
  demoProfileOf,
  isDemoMode,
} from "@/lib/demo";
import type { Profile } from "@/types";
import type { User } from "@supabase/supabase-js";

export interface SessionInfo {
  user: User;
  profile: Profile | null;
}

/** Retorna o usuário autenticado e seu profile, ou null. */
export async function getSessionInfo(): Promise<SessionInfo | null> {
  if (isDemoMode) {
    const id = cookies().get(DEMO_SESSION_COOKIE)?.value;
    const demoUser = demoGetUser(id);
    if (!demoUser) return null;
    return {
      user: {
        id: demoUser.id,
        email: demoUser.email,
        created_at: demoUser.created_at,
      } as User,
      profile: demoProfileOf(demoUser),
    };
  }

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
