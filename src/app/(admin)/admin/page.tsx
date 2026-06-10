import Link from "next/link";
import { FileStack, KeySquare, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [{ count: userCount }, { count: pageCount }, { count: permissionCount }] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("pages").select("id", { count: "exact", head: true }),
      admin.from("user_pages").select("id", { count: "exact", head: true }),
    ]);

  const cards = [
    {
      href: "/admin/usuarios",
      title: "Usuários",
      value: userCount ?? 0,
      description: "Contas cadastradas no portal",
      icon: Users,
    },
    {
      href: "/admin/paginas",
      title: "Páginas",
      value: pageCount ?? 0,
      description: "Dashboards Power BI cadastrados",
      icon: FileStack,
    },
    {
      href: "/admin/usuarios",
      title: "Permissões",
      value: permissionCount ?? 0,
      description: "Liberações de acesso ativas",
      icon: KeySquare,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">
          Administração do portal de dashboards.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, title, value, description, icon: Icon }) => (
          <Link key={title} href={href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{value}</div>
                <CardDescription className="mt-1">{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
