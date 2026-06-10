import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionInfo } from "@/lib/auth/session";
import {
  demoGetUser,
  demoListPages,
  demoHasPermission,
  isDemoMode,
} from "@/lib/demo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PermissionToggle } from "@/components/admin/PermissionToggle";
import { UserProfileForm } from "@/components/admin/UserProfileForm";
import { UserSecurityActions } from "@/components/admin/UserSecurityActions";
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
    return {
      user: demoUser,
      profile: { full_name: demoUser.full_name, role: demoUser.role },
      allPages,
      allowedPageIds: new Set(
        allPages.filter((p) => demoHasPermission(id, p.id)).map((p) => p.id)
      ),
      banned: false,
    };
  }

  const admin = createAdminClient();
  const { data: userData, error } = await admin.auth.admin.getUserById(id);
  if (error || !userData?.user) return null;
  const user = userData.user;

  const [{ data: profile }, { data: pages }, { data: userPages }] =
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
    ]);

  return {
    user,
    profile: profile ?? null,
    allPages: (pages ?? []) as unknown as SidebarPage[],
    allowedPageIds: new Set((userPages ?? []).map((p) => p.page_id)),
    banned: isBanned(user as { banned_until?: string }),
  };
}

export default async function UserEditPage({ params }: UserEditPageProps) {
  const details = await getUserDetails(params.id);
  if (!details) notFound();
  const { user, profile, allPages, allowedPageIds, banned } = details;

  const session = await getSessionInfo();
  const isSelf = session?.user.id === user.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/usuarios" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile?.full_name ?? user.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            Permissões de acesso do usuário.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do usuário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Criado em</p>
              <p className="font-medium">
                {new Date(user.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>

          <UserProfileForm
            userId={user.id}
            initialName={profile?.full_name ?? ""}
            initialRole={profile?.role ?? "user"}
            isSelf={isSelf}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acesso e segurança</CardTitle>
          <CardDescription>
            Senha, bloqueio de acesso e exclusão da conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserSecurityActions
            userId={user.id}
            email={user.email ?? ""}
            isSelf={isSelf}
            initialBanned={banned}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Páginas</CardTitle>
          <CardDescription>
            Ative ou desative o acesso deste usuário a cada dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {allPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma página cadastrada.
            </p>
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
    </div>
  );
}
