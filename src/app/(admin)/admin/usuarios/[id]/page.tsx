import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionInfo } from "@/lib/auth/session";
import {
  demoAccessLogs,
  demoGetUser,
  demoHasPermission,
  demoListPages,
  demoResetUntil,
  isDemoMode,
} from "@/lib/demo";
import { getResetUntil } from "@/lib/auth/passwordReset";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { PermissionToggle } from "@/components/admin/PermissionToggle";
import { UserProfileForm } from "@/components/admin/UserProfileForm";
import { UserPasswordActions } from "@/components/admin/UserPasswordActions";
import { UserDangerZone } from "@/components/admin/UserDangerZone";
import { ActivityList, type ActivityEntry } from "@/components/admin/ActivityList";
import { formatDateBR } from "@/lib/utils";
import type { Role, SidebarPage } from "@/types";

export const dynamic = "force-dynamic";

interface UserEditPageProps {
  params: { id: string };
}

interface UserDetails {
  user: { id: string; email?: string; created_at: string };
  profile: { full_name: string | null; role: Role } | null;
  allPages: SidebarPage[];
  allowedPageIds: Set<string>;
  banned: boolean;
  activity: ActivityEntry[];
  resetUntil: string | null;
}

/** banned_until vem do Supabase Auth; no passado ou ausente = ativo. */
function isBanned(user: { banned_until?: string }): boolean {
  if (!user.banned_until) return false;
  const until = new Date(user.banned_until).getTime();
  return Number.isFinite(until) && until > Date.now();
}

async function getUserDetails(id: string): Promise<UserDetails | null> {
  if (isDemoMode) {
    const demoUser = demoGetUser(id);
    if (!demoUser) return null;
    const allPages = demoListPages();
    const iconByPageId = new Map(allPages.map((p) => [p.id, p.icon]));
    return {
      user: demoUser,
      profile: { full_name: demoUser.full_name, role: demoUser.role },
      allPages,
      allowedPageIds: new Set(
        allPages.filter((p) => demoHasPermission(id, p.id)).map((p) => p.id)
      ),
      banned: !!demoUser.banned,
      activity: demoAccessLogs()
        .filter((l) => l.user_id === id)
        .slice(0, 15)
        .map((l) => ({ ...l, icon: iconByPageId.get(l.page_id) })),
      resetUntil: demoResetUntil(id),
    };
  }

  const admin = createAdminClient();
  const { data: userData, error } = await admin.auth.admin.getUserById(id);
  if (error || !userData?.user) return null;
  const user = userData.user;

  // A liberação de senha vem numa consulta separada: se a migration 0003
  // ainda não rodou, só esse recurso fica indisponível (o resto da página não).
  const [{ data: profile }, { data: pages }, { data: userPages }, { data: logs }, resetUntil] =
    await Promise.all([
      admin
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle<{ full_name: string | null; role: Role }>(),
      admin
        .from("pages")
        .select('id, slug, label, icon, "order", is_active, created_at')
        .order("order", { ascending: true }),
      admin.from("user_pages").select("page_id").eq("user_id", user.id),
      admin
        .from("access_logs")
        .select("id, page_id, page_label, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15),
      getResetUntil(user.id),
    ]);

  const allPages = (pages ?? []) as unknown as SidebarPage[];
  const iconByPageId = new Map(allPages.map((p) => [p.id, p.icon]));

  return {
    user,
    profile: profile ?? null,
    allPages,
    allowedPageIds: new Set((userPages ?? []).map((p) => p.page_id)),
    banned: isBanned(user as { banned_until?: string }),
    activity: (logs ?? []).map((log) => ({
      id: log.id,
      page_label: log.page_label,
      icon: log.page_id ? iconByPageId.get(log.page_id) : null,
      created_at: log.created_at,
    })),
    resetUntil,
  };
}

const stagger = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default async function UserEditPage({ params }: UserEditPageProps) {
  const details = await getUserDetails(params.id);
  if (!details) notFound();
  const { user, profile, allPages, allowedPageIds, banned, activity, resetUntil } = details;

  const session = await getSessionInfo();
  const isSelf = session?.user.id === user.id;
  const role = profile?.role ?? "user";

  return (
    <div className="animate-view-in">
      <PageHeader
        title={profile?.full_name ?? user.email ?? "Usuário"}
        description={user.email}
        back={
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/admin/usuarios" aria-label="Voltar para usuários">
              <ArrowLeft />
            </Link>
          </Button>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={role === "admin" ? "default" : "info"}>{role === "admin" ? "admin" : "usuário"}</Badge>
            <Badge variant={banned ? "destructive" : "default"}>{banned ? "desativado" : "ativo"}</Badge>
          </div>
        }
      />

      <div className="space-y-4">
        <Card className="stagger" style={stagger(0)}>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
            <CardDescription>Criado em {formatDateBR(user.created_at)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <UserProfileForm
              userId={user.id}
              initialName={profile?.full_name ?? ""}
              initialRole={role}
              isSelf={isSelf}
            />
            <div className="border-t pt-5">
              <p className="mb-4 font-display text-sm font-semibold tracking-[-0.02em]">Senha</p>
              <UserPasswordActions userId={user.id} resetUntil={resetUntil} />
            </div>
          </CardContent>
        </Card>

        <Card className="stagger" style={stagger(1)}>
          <CardHeader>
            <CardTitle>Painéis</CardTitle>
            <CardDescription>Ligue ou desligue o acesso a cada dashboard. Salva na hora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0.5 px-3 sm:px-3">
            {allPages.length === 0 ? (
              <p className="px-3 text-sm text-muted-foreground">Nenhum painel cadastrado.</p>
            ) : (
              allPages.map((page) => (
                <PermissionToggle
                  key={page.id}
                  userId={user.id}
                  page={page}
                  initialEnabled={allowedPageIds.has(page.id)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="stagger" style={stagger(2)}>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
            <CardDescription>Últimos dashboards abertos por este usuário.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityList entries={activity} />
          </CardContent>
        </Card>

        <Card className="stagger border-destructive/35" style={stagger(3)}>
          <CardHeader>
            <CardTitle className="text-destructive">Zona de perigo</CardTitle>
            <CardDescription>Ações que tiram o acesso do usuário.</CardDescription>
          </CardHeader>
          <CardContent>
            <UserDangerZone
              userId={user.id}
              email={user.email ?? ""}
              isSelf={isSelf}
              initialBanned={banned}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
