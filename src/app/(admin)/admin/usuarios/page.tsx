import { createAdminClient } from "@/lib/supabase/server";
import { DEMO_USERS, demoCountPermissions, isDemoMode } from "@/lib/demo";
import { UserTable } from "@/components/admin/UserTable";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import type { AdminUserRow, Role } from "@/types";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

interface UsersPageProps {
  searchParams: { page?: string };
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const currentPage = Math.max(1, Number(searchParams.page) || 1);

  if (isDemoMode) {
    const rows: AdminUserRow[] = DEMO_USERS.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      page_count: demoCountPermissions(u.id),
      created_at: u.created_at,
      banned: false,
    }));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie quem acessa o portal e suas permissões.
            </p>
          </div>
          <CreateUserDialog />
        </div>
        <UserTable rows={rows} currentPage={1} hasNextPage={false} />
      </div>
    );
  }

  const admin = createAdminClient();

  const { data: usersData } = await admin.auth.admin.listUsers({
    page: currentPage,
    perPage: PER_PAGE,
  });

  const users = usersData?.users ?? [];
  const ids = users.map((u) => u.id);

  const [{ data: profiles }, { data: permissions }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    admin
      .from("user_pages")
      .select("user_id")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p as { id: string; full_name: string | null; role: Role }])
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
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie quem acessa o portal e suas permissões.
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <UserTable
        rows={rows}
        currentPage={currentPage}
        hasNextPage={users.length === PER_PAGE}
      />
    </div>
  );
}
