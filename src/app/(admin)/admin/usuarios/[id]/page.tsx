import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PermissionToggle } from "@/components/admin/PermissionToggle";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";
import type { Role, SidebarPage } from "@/types";

export const dynamic = "force-dynamic";

interface UserEditPageProps {
  params: { id: string };
}

export default async function UserEditPage({ params }: UserEditPageProps) {
  const admin = createAdminClient();

  const { data: userData, error } = await admin.auth.admin.getUserById(
    params.id
  );
  if (error || !userData?.user) notFound();
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

  const allowedPageIds = new Set((userPages ?? []).map((p) => p.page_id));
  const allPages = (pages ?? []) as unknown as SidebarPage[];

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
        <CardContent className="space-y-3">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Nome</p>
              <p className="font-medium">{profile?.full_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <Badge
                variant={profile?.role === "admin" ? "default" : "secondary"}
              >
                {profile?.role ?? "user"}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Criado em</p>
              <p className="font-medium">
                {new Date(user.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="pt-2">
            <ResetPasswordButton email={user.email ?? ""} />
          </div>
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
