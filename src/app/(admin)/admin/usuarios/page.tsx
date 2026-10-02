import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_USERS, demoCountPermissions, demoLastSeen, isDemoMode } from "@/lib/demo";
import { UserTable } from "@/components/admin/UserTable";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import type { User } from "@supabase/supabase-js";
import type { AdminUserRow, Role } from "@/types";

export const dynamic = "force-dynamic";

/** Todos os usuários do Auth (a tabela ordena e pagina no navegador). */
async function listAllAuthUsers(admin: ReturnType<typeof createAdminClient>) {
  const all: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers falhou: ${error.message}`);
    const users = data?.users ?? [];
    all.push(...users);
    if (users.length < 1000) break;
  }
  return all;
}

export default async function UsersPage() {
  if (isDemoMode) {
    const rows: AdminUserRow[] = DEMO_USERS.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      page_count: demoCountPermissions(u.id),
      created_at: u.created_at,
      banned: !!u.banned,
      last_sign_in_at: null,
      last_seen_at: demoLastSeen(u.id),
    }));

    return (
      <div className="animate-view-in">
        <PageHeader
          title="Usuários"
          description="Gerencie quem acessa o portal e suas permissões."
          actions={<CreateUserDialog />}
        />
        <UserTable rows={rows} />
      </div>
    );
  }

  const admin = createAdminClient();

  const users = await listAllAuthUsers(admin);
  const ids = users.map((u) => u.id);

  const [{ data: profiles }, { data: permissions }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, last_seen_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    admin
      .from("user_pages")
      .select("user_id")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      p as {
        id: string;
        full_name: string | null;
        role: Role;
        last_seen_at: string | null;
      },
    ])
  );
  const countByUser = new Map<string, number>();
  for (const row of permissions ?? []) {
    countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1);
  }

  const rows: AdminUserRow[] = users.map((u) => {
    const bannedUntil = (u as { banned_until?: string }).banned_until;
    const bannedTs = bannedUntil ? new Date(bannedUntil).getTime() : NaN;
    return {
      id: u.id,
      email: u.email ?? "—",
      full_name: profileById.get(u.id)?.full_name ?? null,
      role: profileById.get(u.id)?.role ?? "user",
      page_count: countByUser.get(u.id) ?? 0,
      created_at: u.created_at,
      banned: Number.isFinite(bannedTs) && bannedTs > Date.now(),
      last_sign_in_at: u.last_sign_in_at ?? null,
      last_seen_at: profileById.get(u.id)?.last_seen_at ?? null,
    };
  });

  return (
    <div className="animate-view-in">
      <PageHeader
        title="Usuários"
        description="Gerencie quem acessa o portal e suas permissões."
        actions={<CreateUserDialog />}
      />

      <UserTable rows={rows} />
    </div>
  );
}
