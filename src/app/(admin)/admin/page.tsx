import Link from "next/link";
import { ArrowUpRight, FileStack, KeySquare, Users, type LucideIcon } from "lucide-react";
import { getOverviewData } from "@/lib/admin/overview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/PageHeader";
import { DailyAccessChart, TopPagesChart } from "@/components/admin/OverviewCharts";

export const dynamic = "force-dynamic";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

interface StatCardProps {
  href: string;
  title: string;
  value: number;
  support: string;
  icon: LucideIcon;
  index: number;
}

function StatCard({ href, title, value, support, icon: Icon, index }: StatCardProps) {
  return (
    <Link
      href={href}
      style={{ "--i": index } as React.CSSProperties}
      className="stagger group relative block overflow-hidden rounded-xl border bg-card p-5 transition-[transform,border-color,box-shadow] [transition-duration:400ms] ease-spring hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_14px_34px_rgb(0_0_0/.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgb(150_215_55/.22),transparent_70%)] opacity-0 transition-opacity [transition-duration:500ms] group-hover:opacity-100"
      />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/[.12] text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-[34px] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="mt-2.5 flex items-center gap-1 text-[13px] text-muted-foreground">
        {support}
        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const data = await getOverviewData();
  const avgPerUser = data.permissions.usersWithAccess
    ? (data.permissions.total / data.permissions.usersWithAccess).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
    : "0";

  return (
    <div className="animate-view-in">
      <PageHeader title="Visão geral" description="Quem está usando o portal e o que mais se abre." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          index={0}
          href="/admin/usuarios"
          title="Usuários"
          value={data.users.total}
          icon={Users}
          support={`${plural(data.users.seenLast24h, "entrou", "entraram")} nas últimas 24h`}
        />
        <StatCard
          index={1}
          href="/admin/paginas"
          title="Painéis"
          value={data.pages.total}
          icon={FileStack}
          support={`${plural(data.pages.active, "ativo", "ativos")} · ${plural(data.pages.total - data.pages.active, "inativo", "inativos")}`}
        />
        <StatCard
          index={2}
          href="/admin/usuarios"
          title="Liberações"
          value={data.permissions.total}
          icon={KeySquare}
          support={`média de ${avgPerUser} por usuário com acesso`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="stagger" style={{ "--i": 3 } as React.CSSProperties}>
          <CardHeader className="pb-4">
            <CardTitle>Acessos por dia</CardTitle>
            <CardDescription>
              Últimas 2 semanas · {plural(data.periodTotal, "abertura", "aberturas")} de painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.periodTotal ? (
              <DailyAccessChart data={data.daily} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ainda sem acessos registrados nas últimas 2 semanas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="stagger" style={{ "--i": 4 } as React.CSSProperties}>
          <CardHeader className="pb-4">
            <CardTitle>Painéis mais abertos</CardTitle>
            <CardDescription>Mesmo período</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topPages.length ? (
              <TopPagesChart data={data.topPages} />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Nada por aqui ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
